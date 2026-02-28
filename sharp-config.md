# Sharp Configuration & Image Optimization Reference

Complete configuration guide for the `sharp` image processing library in the Daltaners platform. Covers security settings, format optimization, variant generation, and performance tuning.

## Table of Contents
1. Installation & Build Requirements
2. Global Sharp Defaults
3. Security Configuration
4. Format-Specific Optimization Settings
5. Variant Generation Specs (Full Matrix)
6. Blurhash Generation
7. GIF & Animated Image Handling
8. PDF Thumbnail Generation (KYC/Prescription)
9. Performance Tuning (Concurrency, Memory, Timeouts)
10. Kubernetes Resource Sizing for Image Workers
11. CDN Cache Headers
12. Migration: Re-processing Existing Images

---

## 1. Installation & Build Requirements

```bash
# sharp uses native libvips — pin a known-good version
npm install sharp@0.33.x

# In Dockerfile, ensure libvips build dependencies exist (alpine):
# sharp bundles prebuilt libvips for linux-x64 and linux-arm64
# If using alpine, install the musl variant:
RUN apk add --no-cache vips-dev build-base

# For production multi-stage Docker builds, sharp's prebuilt binaries
# are self-contained — no system libvips needed if using:
#   node:20-slim  (Debian slim)
#   node:20-alpine (Alpine — needs sharp's linuxmusl platform)

# Force platform in CI if cross-compiling:
npm install --os=linux --cpu=x64 sharp
```

**Lock file hygiene:** Always commit `package-lock.json`. Sharp's native binaries are platform-specific — inconsistent lock files cause build failures.

---

## 2. Global Sharp Defaults

Set these ONCE at application startup (e.g., in `main.ts` or a provider factory):

```typescript
import * as sharp from 'sharp';

// ── Security Defaults ──────────────────────────────────────────
sharp.cache(false);
// Disable sharp's internal file cache. We use Redis for caching.
// The internal cache can leak data between unrelated requests.

sharp.simd(true);
// Enable SIMD acceleration (auto-detected on x86/ARM).
// ~2-3× faster resize on supported CPUs.

sharp.concurrency(2);
// Limit libvips thread pool to 2 threads PER sharp instance.
// With Node.js concurrency of 3 (BullMQ), total = 6 threads.
// Tune based on container CPU limit. Formula:
//   sharp.concurrency = Math.max(1, Math.floor(CPU_LIMIT / WORKER_CONCURRENCY))
//
// CPU_LIMIT=2 cores, WORKER_CONCURRENCY=3 → sharp.concurrency(1)
// CPU_LIMIT=4 cores, WORKER_CONCURRENCY=3 → sharp.concurrency(1)
// CPU_LIMIT=8 cores, WORKER_CONCURRENCY=3 → sharp.concurrency(2)
```

---

## 3. Security Configuration

Every `sharp()` call that touches user-provided data MUST include these options:

```typescript
const SECURITY_OPTIONS: sharp.SharpOptions = {
  // ── Decompression bomb protection ──
  limitInputPixels: 100_000_000,
  // 100 megapixels absolute ceiling.
  // A 10000×10000 image = 100MP = 400MB uncompressed RGBA.
  // This is the LAST line of defense. The ImageValidationPipe
  // enforces tighter per-context limits (e.g., 16MP for product images).

  // ── Corrupt/malicious data handling ──
  failOn: 'error',
  // Options: 'none' | 'truncated' | 'error' | 'warning'
  // 'error' = reject any file that libvips can't fully decode.
  // 'none' would silently accept partial/corrupt images — NEVER use.

  // ── Memory-efficient sequential reads ──
  sequentialRead: true,
  // Forces libvips to read the image top-to-bottom instead of
  // random-access. Uses dramatically less memory for large images.
  // Trade-off: some operations (like affine transforms) need random
  // access and will internally disable this. For resize + convert
  // (our main use case), sequential read is optimal.
};

// Usage:
const pipeline = sharp(buffer, SECURITY_OPTIONS);
```

### Per-Context Pixel Limits

| Upload Context       | `limitInputPixels` | Max Dimension | Max Total Pixels | Rationale                               |
|---------------------|--------------------|---------------|------------------|-----------------------------------------|
| Product image       | 50_000_000         | 4096          | 16_000_000       | Standard product photography            |
| Profile avatar      | 10_000_000         | 2048          | 4_000_000        | Small images, no reason for large       |
| Review photo        | 50_000_000         | 4096          | 16_000_000       | User-generated, similar to product      |
| Chat image          | 25_000_000         | 4096          | 16_000_000       | Shared images, moderate limits          |
| Proof of delivery   | 50_000_000         | 4096          | 16_000_000       | Phone camera photos                     |
| KYC document        | 50_000_000         | 4096          | 16_000_000       | Scanned documents can be high-res       |
| Banner image        | 50_000_000         | 4096 × 2048   | 8_000_000        | Wide aspect ratio, moderate res         |
| Vehicle condition   | 50_000_000         | 4096          | 16_000_000       | Phone camera photos                     |

---

## 4. Format-Specific Optimization Settings

### WebP Output (Default for All Variants)

WebP is the default output format for all image variants. It provides 50-80% smaller files than JPEG at equivalent visual quality.

```typescript
const WEBP_SETTINGS: Record<string, sharp.WebpOptions> = {
  // Thumbnails — max compression, visual quality less critical
  thumbnail: {
    quality: 70,
    effort: 5,             // Higher effort = slower encode, smaller file
    smartSubsample: true,  // Better chroma subsampling decisions
    nearLossless: false,
    alphaQuality: 80,
  },

  // Small / medium — balanced
  small: {
    quality: 75,
    effort: 4,
    smartSubsample: true,
    nearLossless: false,
    alphaQuality: 85,
  },
  medium: {
    quality: 80,
    effort: 4,
    smartSubsample: true,
    nearLossless: false,
    alphaQuality: 85,
  },

  // Large — prioritize quality
  large: {
    quality: 85,
    effort: 4,
    smartSubsample: true,
    nearLossless: false,
    alphaQuality: 90,
  },

  // Original — near-lossless for archival quality
  original: {
    quality: 90,
    effort: 6,             // Max effort for archival
    smartSubsample: true,
    nearLossless: true,    // Near-lossless mode
    alphaQuality: 100,
  },
};
```

### JPEG Fallback (For Legacy Clients)

Only generate JPEG if specifically requested (e.g., email attachments, older browsers):

```typescript
const JPEG_FALLBACK: sharp.JpegOptions = {
  quality: 82,
  mozjpeg: true,           // Use MozJPEG encoder — 10-15% smaller than libjpeg
  chromaSubsampling: '4:2:0',
  trellisQuantisation: true,
  overshootDeringing: true,
  optimizeScans: true,     // Progressive JPEG with optimized scan layers
  optimizeCoding: true,
};
```

### PNG (Only When Transparency is Required and WebP is Not Supported)

```typescript
const PNG_SETTINGS: sharp.PngOptions = {
  compressionLevel: 8,    // 0-9, higher = slower + smaller
  adaptiveFiltering: true,
  palette: false,          // Don't force palette mode — let libvips decide
  effort: 8,              // 1-10, higher = slower + smaller
};
```

### AVIF (Future — When Browser Support Reaches >95%)

```typescript
const AVIF_SETTINGS: sharp.AvifOptions = {
  quality: 65,             // AVIF quality scale differs from WebP/JPEG
  effort: 5,              // 0-9
  chromaSubsampling: '4:2:0',
  lossless: false,
};
// AVIF produces ~20% smaller files than WebP but encodes 5-10× slower.
// Enable only for background/batch processing, not synchronous uploads.
```

---

## 5. Variant Generation Specs (Full Matrix)

```typescript
export interface VariantSpec {
  name: string;
  maxWidth: number;
  maxHeight: number;
  fit: 'cover' | 'inside' | 'contain';
  position: string;              // For 'cover' fit
  format: 'webp';
  formatOptions: sharp.WebpOptions;
  sharpen: boolean;              // Apply sharpening after downscale
}

export const VARIANT_SPECS: Record<string, VariantSpec> = {
  thumbnail: {
    name: 'thumbnail',
    maxWidth: 150,
    maxHeight: 150,
    fit: 'cover',                // Crop to fill — consistent grid appearance
    position: 'attention',       // libvips attention-based crop (focus on interesting area)
    format: 'webp',
    formatOptions: WEBP_SETTINGS.thumbnail,
    sharpen: true,               // Small images benefit from sharpening after downscale
  },
  small: {
    name: 'small',
    maxWidth: 320,
    maxHeight: 320,
    fit: 'inside',               // Scale to fit, preserve aspect ratio
    position: 'centre',
    format: 'webp',
    formatOptions: WEBP_SETTINGS.small,
    sharpen: true,
  },
  medium: {
    name: 'medium',
    maxWidth: 640,
    maxHeight: 640,
    fit: 'inside',
    position: 'centre',
    format: 'webp',
    formatOptions: WEBP_SETTINGS.medium,
    sharpen: false,
  },
  large: {
    name: 'large',
    maxWidth: 1280,
    maxHeight: 1280,
    fit: 'inside',
    position: 'centre',
    format: 'webp',
    formatOptions: WEBP_SETTINGS.large,
    sharpen: false,
  },
  original: {
    name: 'original',
    maxWidth: 2048,
    maxHeight: 2048,
    fit: 'inside',
    position: 'centre',
    format: 'webp',
    formatOptions: WEBP_SETTINGS.original,
    sharpen: false,
  },
};
```

### Applying Sharpening

Downscaling images can make them look soft. Apply a mild unsharp mask to thumbnails and small variants:

```typescript
function buildPipeline(buffer: Buffer, spec: VariantSpec): sharp.Sharp {
  let pipeline = sharp(buffer, SECURITY_OPTIONS)
    .resize(spec.maxWidth, spec.maxHeight, {
      fit: spec.fit,
      position: spec.position,
      withoutEnlargement: true,  // NEVER upscale
      kernel: 'lanczos3',        // Best quality downscale kernel
    });

  if (spec.sharpen) {
    pipeline = pipeline.sharpen({
      sigma: 0.8,    // Radius of sharpening — 0.5–1.5 is subtle
      m1: 1.0,       // Flat area sharpening
      m2: 0.7,       // Edge sharpening (lower = less haloing)
    });
  }

  return pipeline.webp(spec.formatOptions);
}
```

---

## 6. Blurhash Generation

Blurhash produces a short string (~20-30 characters) that encodes a blurry placeholder. The React/React Native app decodes this client-side for instant placeholder rendering while the real image loads.

```typescript
import { encode } from 'blurhash';
import * as sharp from 'sharp';

async function generateBlurhash(sanitizedBuffer: Buffer): Promise<string> {
  // Resize to tiny resolution for fast hashing
  const HASH_WIDTH = 32;

  const { data, info } = await sharp(sanitizedBuffer, SECURITY_OPTIONS)
    .resize(HASH_WIDTH, null, { fit: 'inside' })
    .ensureAlpha()          // Blurhash needs RGBA pixel data
    .raw()                  // Raw pixel buffer (no encoding)
    .toBuffer({ resolveWithObject: true });

  // Components: 4×3 provides good detail-to-size ratio
  // Increasing components → longer string, more detail
  // 4×3 = ~20 chars, good for most product/avatar images
  return encode(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,   // X components (horizontal detail)
    3,   // Y components (vertical detail)
  );
}

// Store the blurhash string alongside image URLs in PostgreSQL:
// product_images table: { id, product_id, upload_id, blurhash, urls JSONB, ... }
```

### React Native Decoding

```tsx
// Install: npm install react-native-blurhash
import { Blurhash } from 'react-native-blurhash';

<Blurhash
  blurhash={product.images[0].blurhash}
  style={{ width: '100%', aspectRatio: 1 }}
  decodeWidth={32}
  decodeHeight={32}
/>
```

### React Web Decoding

```tsx
// Install: npm install react-blurhash
import { BlurhashCanvas } from 'react-blurhash';

<BlurhashCanvas
  hash={product.images[0].blurhash}
  width={320}
  height={320}
  punch={1}
/>
```

---

## 7. GIF & Animated Image Handling

GIFs are allowed ONLY in chat image uploads. They require special handling:

```typescript
async function processGif(buffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(buffer, {
    ...SECURITY_OPTIONS,
    animated: true,   // Enable animated GIF support
    pages: -1,        // Read all frames
  }).metadata();

  // Hard limits for animated images
  const MAX_GIF_FRAMES = 150;
  const MAX_GIF_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
  const MAX_GIF_DIMENSION = 480;

  if ((metadata.pages ?? 1) > MAX_GIF_FRAMES) {
    throw new BadRequestException(`Animated image has too many frames (${metadata.pages}, max ${MAX_GIF_FRAMES})`);
  }

  // Re-encode as animated WebP (smaller than GIF, maintains animation)
  return sharp(buffer, {
    ...SECURITY_OPTIONS,
    animated: true,
    pages: -1,
  })
    .resize(MAX_GIF_DIMENSION, MAX_GIF_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 65,
      effort: 3,         // Lower effort for animated — encoding is expensive
      loop: metadata.loop ?? 0,
    })
    .toBuffer();
}
```

**Important:** Animated images are processed synchronously only for chat (small, <5MB). For any larger animated images, route through BullMQ.

---

## 8. PDF Thumbnail Generation

For KYC documents and prescription photos uploaded as PDFs, generate a thumbnail of the first page:

```typescript
async function generatePdfThumbnail(pdfBuffer: Buffer): Promise<Buffer> {
  // sharp can render the first page of a PDF via libvips+poppler
  return sharp(pdfBuffer, {
    ...SECURITY_OPTIONS,
    density: 150,       // DPI for PDF rendering (150 = good quality, not excessive)
    page: 0,            // First page only
  })
    .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
}
```

**Note:** PDF rendering requires `libpoppler` installed in the container. Add to Dockerfile:
```dockerfile
RUN apk add --no-cache poppler-utils
```

---

## 9. Performance Tuning

### Memory Budget Per Image Operation

| Operation                      | Peak Memory (approx)         | Notes                              |
|-------------------------------|-----------------------------|------------------------------------|
| Read metadata only            | ~1 MB                       | Header only, no decompression      |
| Decode 4096×4096 JPEG         | ~64 MB                      | 4096×4096×4 bytes RGBA             |
| Resize 4096→1280              | ~90 MB                      | Source + destination buffers        |
| Generate 5 variants           | ~150 MB                     | Sequential, not parallel            |
| Full pipeline (1 image)       | ~200 MB peak                | With virus scan buffer              |
| Full pipeline (3 concurrent)  | ~500 MB peak                | BullMQ concurrency=3               |

### Recommended Container Resources

```yaml
# For synchronous upload endpoints (in the API service)
resources:
  requests: { memory: "512Mi", cpu: "500m" }
  limits:   { memory: "1Gi",   cpu: "2000m" }

# For BullMQ image worker (dedicated pod)
resources:
  requests: { memory: "768Mi", cpu: "1000m" }
  limits:   { memory: "1.5Gi", cpu: "4000m" }
```

### Processing Timeouts

```typescript
// In the controller — overall request timeout
@UseInterceptors(TimeoutInterceptor(30_000))  // 30s max for upload + process

// In BullMQ job options
const JOB_OPTIONS = {
  timeout: 60_000,          // 60s max per job
  attempts: 2,              // Retry once on failure
  backoff: { type: 'fixed', delay: 5000 },
  removeOnComplete: { age: 3600 },  // Clean up completed jobs after 1hr
  removeOnFail: { age: 86400 },     // Keep failed jobs for 24hr (debugging)
};
```

### Generate Variants Sequentially, Not in Parallel

```typescript
// WRONG — parallel variant generation spikes memory
const variants = await Promise.all(
  specs.map(spec => createVariant(buffer, spec))
);

// RIGHT — sequential generation uses bounded memory
const variants: ProcessedVariant[] = [];
for (const spec of specs) {
  variants.push(await createVariant(buffer, spec));
}
```

This is critical because each variant decode/encode uses ~90MB peak. Running 5 in parallel could spike to 450MB. Sequential processing keeps peak at ~150MB.

---

## 10. CDN Cache Headers

Set these headers on S3 objects (via `PutObjectCommand` metadata) so CloudFront caches them properly:

```typescript
// Immutable content (variant files named by upload_id — content never changes)
const CACHE_HEADERS = {
  CacheControl: 'public, max-age=31536000, immutable',
  // 1 year cache. "immutable" tells browsers to never revalidate.
  // Safe because upload_id is unique — new uploads get new URLs.
};

// For private content (KYC docs — served via CloudFront signed URLs)
const PRIVATE_CACHE_HEADERS = {
  CacheControl: 'private, max-age=300',
  // 5 minutes. Short cache for security-sensitive documents.
};
```

### CloudFront Configuration

```
Origin: S3 bucket (daltaners-uploads)
Behavior:
  Path: /uploads/*
  Origin Access Control: Yes (OAC, not OAI)
  Viewer Protocol: HTTPS only
  Allowed Methods: GET, HEAD, OPTIONS
  Cache Policy: Managed-CachingOptimized (TTL respects Cache-Control)
  Response Headers Policy:
    X-Content-Type-Options: nosniff
    Content-Security-Policy: default-src 'none'; img-src 'self'
    Strict-Transport-Security: max-age=63072000
```

---

## 11. Migration: Re-processing Existing Images

When you need to regenerate variants (e.g., adding a new variant size, switching format to AVIF), use a batch migration script:

```typescript
// scripts/reprocess-images.ts
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { ImageOptimizationService } from '../modules/media/services/image-optimization.service';
import { ImageStorageService } from '../modules/media/services/image-storage.service';

async function reprocessAll(entityType: string) {
  // 1. List all upload_id prefixes for the entity type
  // 2. For each upload, download the 'original' variant
  // 3. Run through optimization pipeline with updated specs
  // 4. Upload new variants alongside existing ones
  // 5. Update database URLs

  // Run with: npx ts-node scripts/reprocess-images.ts --entity=products --batch-size=50
  // Use BullMQ for production runs to avoid overloading S3/CPU
}
```

**Rules for migration:**
- Always run on a dedicated worker pod, never on API pods
- Process in batches of 50 with 1-second delay between batches
- Log progress and failures to a migration log table
- Keep old variants until migration is verified — don't delete in-place
- Run during off-peak hours (2-5 AM PHT)

---

## 12. Quick Reference: Sharp Method Chain

```typescript
// The canonical Daltaners image processing chain:
sharp(userBuffer, {
  limitInputPixels: 100_000_000,
  failOn: 'error',
  sequentialRead: true,
})
  .rotate()                          // 1. Auto-rotate from EXIF
  .withMetadata({ orientation: undefined }) // 2. Strip EXIF
  .resize(maxWidth, maxHeight, {     // 3. Resize
    fit: 'inside',
    withoutEnlargement: true,
    kernel: 'lanczos3',
  })
  .sharpen({ sigma: 0.8 })          // 4. Optional sharpening (thumbnails only)
  .webp({                            // 5. Encode to WebP
    quality: 80,
    effort: 4,
    smartSubsample: true,
  })
  .toBuffer();                       // 6. Output buffer for S3 upload
```
