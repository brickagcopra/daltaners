---
name: daltaners-image-security
description: |
  Secure image upload pipeline with decompression bomb protection, magic byte validation, EXIF stripping, virus scanning, and multi-variant optimization before S3 storage. ALWAYS use this skill when implementing ANY file upload endpoint, image processing, photo handling, avatar upload, product image upload, proof-of-delivery photo, KYC document upload, review photo upload, or any feature that accepts files from users. Also use this skill when modifying existing upload logic, debugging image-related issues, or reviewing upload security. This covers the full pipeline: validation → sanitization → optimization → storage → CDN serving.
---

# Daltaners Image Security & Optimization Pipeline

This skill defines the mandatory image upload pipeline for the Daltaners platform. Every file upload MUST pass through this pipeline. No exceptions.

## When to Use This Skill

- Creating or modifying ANY file upload endpoint
- Implementing product image uploads for vendors
- Implementing profile/avatar photo uploads
- Implementing proof-of-delivery photo capture
- Implementing KYC document uploads
- Implementing review/rating photo uploads
- Implementing chat image attachments
- Implementing banner/promotional image uploads (admin)
- Implementing prescription photo uploads (pharmacy)
- Implementing car rental vehicle condition photos
- Debugging image upload failures or security issues
- Reviewing pull requests that touch file upload code

## Architecture Overview

```
User Upload → Multer (memory, size-limited)
  → Stage 1: File Size Gate (reject > limit)
  → Stage 2: Magic Byte Validation (reject fakes)
  → Stage 3: Decompression Bomb Check (reject bombs)
  → Stage 4: Virus Scan (ClamAV, reject infected)
  → Stage 5: EXIF Strip + Re-encode (sanitize)
  → Stage 6: Generate Variants (thumbnail, medium, large)
  → Stage 7: Upload to S3 (all variants)
  → Stage 8: Return CDN URLs
```

**For complete implementation code and configuration, read:**
- `references/pipeline-implementation.md` — Full NestJS service code, validators, and interceptors
- `references/sharp-config.md` — Sharp configuration, variant specs, and optimization settings

## Hard Security Rules

### Rule 1: Never Trust Client Data
The `Content-Type` header, `file.mimetype`, and `file.originalname` are ALL user-controlled. A malicious user can send a PHP web shell with `Content-Type: image/jpeg` and filename `photo.jpg`. You MUST validate the actual file content by reading magic bytes from the buffer.

### Rule 2: Decompression Bomb Protection
A decompression bomb is a small file (e.g., 42KB PNG) that decompresses to gigabytes in memory (e.g., 19000×19000 pixels = 1.4GB RAM). This crashes your server or causes OOM kills in Kubernetes.

**Mandatory protections:**
```typescript
// BEFORE any sharp operation, check dimensions from metadata
const metadata = await sharp(buffer, {
  limitInputPixels: 100_000_000,  // 100 megapixels max (e.g., 10000×10000)
  failOn: 'error',                // fail on any corrupt/malicious data
  sequentialRead: true,           // don't load entire image into memory
}).metadata();

// Reject if dimensions are suspicious
const MAX_DIMENSION = 8192;  // 8K pixels per side
const MAX_PIXELS = 50_000_000;  // 50 megapixels

if (!metadata.width || !metadata.height) throw new BadRequestException('Invalid image');
if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) throw new BadRequestException('Image dimensions too large');
if (metadata.width * metadata.height > MAX_PIXELS) throw new BadRequestException('Image pixel count too large');
```

**Why `limitInputPixels` alone is not enough:** It prevents sharp from processing the image, but it throws an error AFTER reading the file header. You must also check the raw buffer size vs. declared dimensions to detect ratio anomalies (small file claiming huge dimensions).

### Rule 3: Magic Byte Validation
```typescript
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png':  [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif':  [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'image/webp': [Buffer.from('RIFF'), /* + bytes 8-11: 'WEBP' */],
  'image/avif': [/* ftyp box check */],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
};
```
Read the first 12 bytes and compare. For WebP, also check bytes 8-11 for 'WEBP'. For AVIF, check the ftyp box.

### Rule 4: EXIF Stripping is Mandatory
User photos contain GPS coordinates, device info, timestamps, and sometimes thumbnail images (which may contain different content than the displayed image). EXIF data has also been used as a vector for XSS payloads in JPEG comments.

```typescript
// sharp automatically strips EXIF when re-encoding
// But explicitly ensure with:
sharp(buffer).rotate()  // Auto-rotate based on EXIF orientation BEFORE stripping
  .withMetadata({ orientation: undefined })  // Remove orientation tag
  // ... other operations
```

### Rule 5: Always Re-encode
Never store the original bytes. Always re-encode through sharp. This:
- Strips embedded scripts, polyglot files, and steganographic payloads
- Normalizes the format
- Ensures the output is a valid image (not a renamed ZIP/EXE)

### Rule 6: Isolate Processing
Image processing should run in a separate worker/container with:
- Memory limits (512MB–1GB max per container)
- CPU limits
- Timeout (30 seconds max per image)
- No network access except S3 upload
- If using Bull/BullMQ queues, process images asynchronously

## File Size Limits

| Upload Context          | Max File Size | Max Dimensions | Allowed Formats          |
|------------------------|---------------|----------------|--------------------------|
| Product image          | 10 MB         | 4096 × 4096    | JPEG, PNG, WebP          |
| Profile avatar         | 5 MB          | 2048 × 2048    | JPEG, PNG, WebP          |
| Review photo           | 8 MB          | 4096 × 4096    | JPEG, PNG, WebP          |
| Chat image             | 5 MB          | 4096 × 4096    | JPEG, PNG, WebP, GIF     |
| Proof of delivery      | 10 MB         | 4096 × 4096    | JPEG, PNG                |
| KYC document           | 15 MB         | 4096 × 4096    | JPEG, PNG, PDF           |
| Prescription photo     | 10 MB         | 4096 × 4096    | JPEG, PNG, PDF           |
| Banner image (admin)   | 10 MB         | 4096 × 2048    | JPEG, PNG, WebP          |
| Vehicle condition      | 10 MB         | 4096 × 4096    | JPEG, PNG                |

## Image Variant Specification

Every uploaded image generates these variants:

| Variant    | Max Width | Max Height | Quality | Format | Use Case                    |
|-----------|-----------|------------|---------|--------|-----------------------------|
| thumbnail | 150       | 150        | 70      | WebP   | List views, grid thumbnails |
| small     | 320       | 320        | 75      | WebP   | Cart items, search results  |
| medium    | 640       | 640        | 80      | WebP   | Product cards, store cards  |
| large     | 1280      | 1280       | 85      | WebP   | Product detail, lightbox    |
| original  | 2048      | 2048       | 90      | WebP   | Zoom view, admin review     |

**Rules:**
- All variants use WebP for output (50-80% smaller than JPEG at same quality)
- Maintain aspect ratio — use `fit: 'inside'` to scale within the max dimensions
- Generate a blurhash string for each image (for placeholder loading in the app)
- Thumbnail uses `fit: 'cover'` with center gravity for consistent grid appearance
- Store all variants in S3 with predictable key structure

## S3 Storage Key Structure

```
uploads/
  {entity_type}/
    {entity_id}/
      {upload_id}/
        thumbnail.webp
        small.webp
        medium.webp
        large.webp
        original.webp
        metadata.json       ← { width, height, blurhash, format, size_bytes }
```

Example:
```
uploads/products/550e8400-e29b-41d4-a716-446655440000/img_001/thumbnail.webp
uploads/products/550e8400-e29b-41d4-a716-446655440000/img_001/medium.webp
```

**S3 Bucket Configuration:**
- Private bucket — no public access
- Serve via CloudFront CDN only (signed URLs for private content like KYC docs)
- Lifecycle rule: Delete incomplete multipart uploads after 1 day
- Enable versioning for audit trail
- Server-side encryption: AES-256 (SSE-S3)

## NestJS Integration Pattern

Read `references/pipeline-implementation.md` for full code, but here's the high-level pattern:

### 1. Create a Shared Image Processing Module

```typescript
// image-processing.module.ts — import this in any service that handles uploads
@Module({
  providers: [
    ImageValidationService,     // Magic bytes + dimensions + bomb detection
    ImageOptimizationService,   // Sharp processing + variant generation
    ImageStorageService,        // S3 upload + CDN URL generation
    VirusScanService,           // ClamAV integration
  ],
  exports: [ImageProcessingPipeline],
})
export class ImageProcessingModule {}
```

### 2. Use in Controllers with Custom Interceptor

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('image', {
  storage: memoryStorage(),  // ALWAYS memory — never disk for untrusted files
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB hard limit at Multer level
}))
@UseGuards(JwtAuthGuard, RolesGuard)
async uploadProductImage(
  @UploadedFile(new ImageValidationPipe({
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxDimension: 4096,
    maxPixels: 16_000_000,
  }))
  file: Express.Multer.File,
  @Param('productId', ParseUUIDPipe) productId: string,
  @CurrentUser() user: JwtPayload,
) {
  const result = await this.imageProcessingPipeline.process(file, {
    entityType: 'products',
    entityId: productId,
    variants: ['thumbnail', 'small', 'medium', 'large', 'original'],
    generateBlurhash: true,
  });
  return { success: true, data: result };
}
```

### 3. Processing Pipeline Service

```typescript
async process(file: Express.Multer.File, options: ProcessingOptions): Promise<ImageResult> {
  // Step 1: Validate (magic bytes, dimensions, bomb check)
  await this.validationService.validate(file.buffer, options);

  // Step 2: Virus scan
  await this.virusScanService.scan(file.buffer);

  // Step 3: Sanitize (strip EXIF, re-encode, auto-rotate)
  const sanitized = await this.optimizationService.sanitize(file.buffer);

  // Step 4: Generate variants
  const variants = await this.optimizationService.generateVariants(sanitized, options.variants);

  // Step 5: Generate blurhash (if requested)
  const blurhash = options.generateBlurhash
    ? await this.optimizationService.generateBlurhash(sanitized)
    : null;

  // Step 6: Upload all variants to S3
  const urls = await this.storageService.uploadVariants(variants, options);

  // Step 7: Return result
  return { urls, blurhash, metadata: variants.metadata };
}
```

## Virus Scanning with ClamAV

### Deployment
Run ClamAV as a sidecar container or separate service in Kubernetes:
```yaml
# k8s/clamav-deployment.yaml
containers:
  - name: clamav
    image: clamav/clamav:1.3
    ports:
      - containerPort: 3310    # clamd TCP socket
    resources:
      requests: { memory: "512Mi", cpu: "250m" }
      limits: { memory: "1Gi", cpu: "500m" }
    volumeMounts:
      - name: clamav-db
        mountPath: /var/lib/clamav   # virus definition database
```

### Integration
Use `clamscan` or `clamav.js` npm package to scan buffers over TCP:
```typescript
import NodeClam from 'clamscan';

const clam = await new NodeClam().init({
  clamdscan: { socket: '/var/run/clamav/clamd.ctl', host: 'clamav-service', port: 3310 },
});

const { isInfected, viruses } = await clam.scanBuffer(buffer);
if (isInfected) {
  logger.warn('Infected file detected', { viruses });
  throw new BadRequestException('File rejected: security scan failed');
}
```

**Rules:**
- Scan EVERY file before storage — no exceptions
- Log detections with full context (user ID, IP, filename)
- Rate-limit uploads per user (max 20 images per minute)
- If ClamAV is unavailable, REJECT uploads — don't skip scanning

## Monitoring & Alerting

Track these metrics for the image pipeline:
- `image.upload.count` — total uploads (by type, by user role)
- `image.upload.rejected` — rejections (by reason: size, type, bomb, virus, dimension)
- `image.processing.duration` — time to process each image (p50, p95, p99)
- `image.processing.errors` — processing failures
- `image.storage.size` — total bytes stored
- `image.bomb.detected` — decompression bomb attempts (ALERT on this)
- `image.virus.detected` — virus detections (ALERT on this)

**Alert if:**
- `image.bomb.detected` > 0 in any 5-minute window
- `image.virus.detected` > 0 in any 5-minute window
- `image.processing.duration` p99 > 15 seconds
- `image.upload.rejected` rate > 20% of total uploads
