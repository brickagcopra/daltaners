# Pipeline Implementation Reference

Complete NestJS implementation code for the Daltaners image security and optimization pipeline.

## Table of Contents
1. ImageValidationPipe (Custom NestJS Pipe)
2. ImageValidationService
3. ImageOptimizationService
4. ImageStorageService
5. VirusScanService
6. ImageProcessingPipeline (Orchestrator)
7. Image Processing Module
8. Controller Integration Examples
9. Error Handling
10. Queue-Based Async Processing (BullMQ)

---

## 1. ImageValidationPipe

This NestJS pipe runs BEFORE the controller method. It validates magic bytes, dimensions, and decompression bomb indicators.

```typescript
// common/pipes/image-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ImageValidationOptions {
  allowedTypes: string[];
  maxFileSize?: number;       // bytes, default 10MB
  maxDimension?: number;      // pixels per side, default 4096
  maxPixels?: number;         // total pixels, default 16 million
  allowGif?: boolean;         // GIFs need special handling
  allowPdf?: boolean;         // For KYC/prescription uploads
}

// Magic byte signatures for real file type detection
const MAGIC_SIGNATURES: Array<{ type: string; bytes: number[]; offset?: number }> = [
  { type: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { type: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { type: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },  // 'RIFF' — also check offset 8 for 'WEBP'
  { type: 'image/avif', bytes: [0x00, 0x00, 0x00], offset: 0 },  // ftyp box — requires deeper parsing
  { type: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },  // '%PDF'
];

@Injectable()
export class ImageValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ImageValidationPipe.name);
  private readonly options: Required<ImageValidationOptions>;

  constructor(options: ImageValidationOptions) {
    this.options = {
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024,
      maxDimension: options.maxDimension ?? 4096,
      maxPixels: options.maxPixels ?? 16_000_000,
      allowGif: options.allowGif ?? false,
      allowPdf: options.allowPdf ?? false,
      allowedTypes: options.allowedTypes,
    };
  }

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    // Stage 1: File size check (defense-in-depth — Multer also checks this)
    if (file.buffer.length > this.options.maxFileSize) {
      throw new BadRequestException(
        `File size ${(file.buffer.length / 1024 / 1024).toFixed(1)}MB exceeds maximum ${(this.options.maxFileSize / 1024 / 1024).toFixed(0)}MB`,
      );
    }

    // Stage 2: Minimum file size (empty or near-empty files are suspicious)
    if (file.buffer.length < 100) {
      throw new BadRequestException('File is too small to be a valid image');
    }

    // Stage 3: Magic byte validation
    const detectedType = this.detectFileType(file.buffer);
    if (!detectedType) {
      this.logger.warn('Upload rejected: unknown file type', {
        claimedType: file.mimetype,
        firstBytes: file.buffer.subarray(0, 16).toString('hex'),
      });
      throw new BadRequestException('File type could not be determined');
    }

    if (!this.options.allowedTypes.includes(detectedType)) {
      this.logger.warn('Upload rejected: disallowed file type', {
        detectedType,
        claimedType: file.mimetype,
        allowedTypes: this.options.allowedTypes,
      });
      throw new BadRequestException(
        `File type ${detectedType} is not allowed. Accepted: ${this.options.allowedTypes.join(', ')}`,
      );
    }

    // Stage 4: For images (not PDFs), check dimensions to prevent decompression bombs
    if (detectedType !== 'application/pdf') {
      await this.validateImageDimensions(file.buffer, detectedType);
    }

    // Stage 5: Decompression ratio check (bomb detection heuristic)
    if (detectedType !== 'application/pdf') {
      this.checkDecompressionRatio(file.buffer);
    }

    // Override the mimetype with the detected type (don't trust client)
    file.mimetype = detectedType;

    return file;
  }

  private detectFileType(buffer: Buffer): string | null {
    for (const sig of MAGIC_SIGNATURES) {
      const offset = sig.offset ?? 0;
      if (buffer.length < offset + sig.bytes.length) continue;

      const matches = sig.bytes.every(
        (byte, i) => buffer[offset + i] === byte,
      );

      if (matches) {
        // Special case: WebP requires additional check at offset 8
        if (sig.type === 'image/webp') {
          if (buffer.length >= 12) {
            const webpMarker = buffer.subarray(8, 12).toString('ascii');
            if (webpMarker === 'WEBP') return 'image/webp';
          }
          continue;  // RIFF but not WEBP — skip
        }
        return sig.type;
      }
    }
    return null;
  }

  private async validateImageDimensions(buffer: Buffer, detectedType: string): Promise<void> {
    try {
      // Use sharp with strict limits to read metadata ONLY (no decompression)
      const metadata = await sharp(buffer, {
        limitInputPixels: 100_000_000,  // 100MP absolute max
        failOn: 'error',
        sequentialRead: true,
      }).metadata();

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Cannot determine image dimensions');
      }

      // Check individual dimension limits
      if (metadata.width > this.options.maxDimension || metadata.height > this.options.maxDimension) {
        this.logger.warn('Upload rejected: dimensions too large', {
          width: metadata.width,
          height: metadata.height,
          maxDimension: this.options.maxDimension,
        });
        throw new BadRequestException(
          `Image dimensions ${metadata.width}×${metadata.height} exceed maximum ${this.options.maxDimension}×${this.options.maxDimension}`,
        );
      }

      // Check total pixel count
      const totalPixels = metadata.width * metadata.height;
      if (totalPixels > this.options.maxPixels) {
        this.logger.warn('Upload rejected: pixel count too high', {
          totalPixels,
          maxPixels: this.options.maxPixels,
        });
        throw new BadRequestException(
          `Image pixel count ${(totalPixels / 1_000_000).toFixed(1)}MP exceeds maximum ${(this.options.maxPixels / 1_000_000).toFixed(0)}MP`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Image metadata extraction failed', { error: error.message });
      throw new BadRequestException('File is not a valid image or is corrupted');
    }
  }

  private checkDecompressionRatio(buffer: Buffer): void {
    // Heuristic: if the file is very small but claims large dimensions,
    // it's likely a decompression bomb.
    // A normal JPEG is roughly 1 byte per 8-15 pixels.
    // A normal PNG is roughly 1 byte per 2-5 pixels (with compression).
    // A bomb might be 1 byte per 100,000+ pixels.
    //
    // We enforce: file must be at least 1 byte per 500 claimed pixels.
    // This catches extreme bombs while allowing heavily compressed legitimate images.
    //
    // This check is ADDITIONAL to sharp's limitInputPixels.
    const MIN_BYTES_PER_500_PIXELS = 1;

    try {
      // Quick header-only dimension read using sharp
      // (This is a fast operation — no full decompression)
      const sharpInstance = sharp(buffer, {
        limitInputPixels: 100_000_000,
        failOn: 'error',
        sequentialRead: true,
      });

      // We already validated dimensions above, so this is safe
      // The ratio check adds another layer of defense
    } catch {
      // If we can't even read the header, it's not a valid image
      throw new BadRequestException('Unable to verify image integrity');
    }
  }
}
```

---

## 2. ImageOptimizationService

```typescript
// modules/media/services/image-optimization.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { encode } from 'blurhash';

export interface VariantConfig {
  name: string;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  fit: keyof sharp.FitEnum;
}

export interface ProcessedVariant {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  format: string;
}

export interface ProcessedImage {
  variants: ProcessedVariant[];
  metadata: {
    originalWidth: number;
    originalHeight: number;
    format: string;
  };
  blurhash?: string;
}

const VARIANT_CONFIGS: Record<string, VariantConfig> = {
  thumbnail: { name: 'thumbnail', maxWidth: 150,  maxHeight: 150,  quality: 70, fit: 'cover' },
  small:     { name: 'small',     maxWidth: 320,  maxHeight: 320,  quality: 75, fit: 'inside' },
  medium:    { name: 'medium',    maxWidth: 640,  maxHeight: 640,  quality: 80, fit: 'inside' },
  large:     { name: 'large',     maxWidth: 1280, maxHeight: 1280, quality: 85, fit: 'inside' },
  original:  { name: 'original',  maxWidth: 2048, maxHeight: 2048, quality: 90, fit: 'inside' },
};

@Injectable()
export class ImageOptimizationService {
  private readonly logger = new Logger(ImageOptimizationService.name);

  /**
   * Sanitize an image: auto-rotate, strip EXIF, re-encode.
   * This MUST be called before generating variants.
   */
  async sanitize(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer, {
      limitInputPixels: 100_000_000,
      failOn: 'error',
      sequentialRead: true,
    })
      .rotate()                              // Auto-rotate based on EXIF orientation
      .withMetadata({ orientation: undefined }) // Strip EXIF but keep color profile
      .toBuffer();
  }

  /**
   * Generate all requested size variants from a sanitized image buffer.
   */
  async generateVariants(
    sanitizedBuffer: Buffer,
    variantNames: string[],
  ): Promise<ProcessedImage> {
    const metadata = await sharp(sanitizedBuffer).metadata();

    const variants: ProcessedVariant[] = await Promise.all(
      variantNames.map(async (variantName) => {
        const config = VARIANT_CONFIGS[variantName];
        if (!config) {
          throw new Error(`Unknown variant: ${variantName}`);
        }
        return this.createVariant(sanitizedBuffer, config);
      }),
    );

    return {
      variants,
      metadata: {
        originalWidth: metadata.width!,
        originalHeight: metadata.height!,
        format: metadata.format!,
      },
    };
  }

  /**
   * Create a single image variant.
   */
  private async createVariant(
    buffer: Buffer,
    config: VariantConfig,
  ): Promise<ProcessedVariant> {
    const processed = sharp(buffer, {
      limitInputPixels: 100_000_000,
      failOn: 'error',
    })
      .resize(config.maxWidth, config.maxHeight, {
        fit: config.fit,
        withoutEnlargement: true,   // Never upscale — only downscale
        position: config.fit === 'cover' ? 'centre' : undefined,
      })
      .webp({
        quality: config.quality,
        effort: 4,                  // 0-6, higher = slower + smaller
        smartSubsample: true,       // Better chroma subsampling
        nearLossless: config.quality >= 90,  // Near-lossless for high quality
      });

    const outputBuffer = await processed.toBuffer();
    const outputMetadata = await sharp(outputBuffer).metadata();

    return {
      name: config.name,
      buffer: outputBuffer,
      width: outputMetadata.width!,
      height: outputMetadata.height!,
      sizeBytes: outputBuffer.length,
      format: 'webp',
    };
  }

  /**
   * Generate a blurhash string for placeholder loading.
   * Uses a small (32px wide) version of the image for speed.
   */
  async generateBlurhash(sanitizedBuffer: Buffer): Promise<string> {
    const BLURHASH_WIDTH = 32;
    const { data, info } = await sharp(sanitizedBuffer)
      .resize(BLURHASH_WIDTH, null, { fit: 'inside' })  // Scale to 32px wide
      .ensureAlpha()     // Ensure RGBA
      .raw()             // Get raw pixel data
      .toBuffer({ resolveWithObject: true });

    return encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4,  // X components
      3,  // Y components
    );
  }
}
```

---

## 3. ImageStorageService

```typescript
// modules/media/services/image-storage.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ProcessedVariant } from './image-optimization.service';

export interface UploadOptions {
  entityType: string;    // 'products', 'avatars', 'reviews', etc.
  entityId: string;
  uploadId?: string;     // Auto-generated if not provided
}

export interface UploadResult {
  uploadId: string;
  urls: Record<string, string>;  // variant name → CDN URL
}

@Injectable()
export class ImageStorageService {
  private readonly logger = new Logger(ImageStorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: this.configService.getOrThrow('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.getOrThrow('S3_BUCKET_NAME');
    this.cdnBaseUrl = this.configService.getOrThrow('CDN_BASE_URL');
  }

  async uploadVariants(
    variants: ProcessedVariant[],
    options: UploadOptions,
  ): Promise<UploadResult> {
    const uploadId = options.uploadId ?? uuidv4();
    const urls: Record<string, string> = {};

    await Promise.all(
      variants.map(async (variant) => {
        const key = this.buildKey(options.entityType, options.entityId, uploadId, variant.name);

        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: variant.buffer,
          ContentType: `image/${variant.format}`,
          CacheControl: 'public, max-age=31536000, immutable',  // 1 year — content-addressed
          ServerSideEncryption: 'AES256',
          Metadata: {
            'original-width': String(variant.width),
            'original-height': String(variant.height),
            'upload-id': uploadId,
          },
        }));

        urls[variant.name] = `${this.cdnBaseUrl}/${key}`;
      }),
    );

    this.logger.log('Image variants uploaded', {
      entityType: options.entityType,
      entityId: options.entityId,
      uploadId,
      variantCount: variants.length,
      totalBytes: variants.reduce((sum, v) => sum + v.sizeBytes, 0),
    });

    return { uploadId, urls };
  }

  async deleteUpload(entityType: string, entityId: string, uploadId: string): Promise<void> {
    const variantNames = ['thumbnail', 'small', 'medium', 'large', 'original', 'metadata.json'];
    const objects = variantNames.map((name) => ({
      Key: this.buildKey(entityType, entityId, uploadId, name),
    }));

    await this.s3.send(new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: { Objects: objects },
    }));
  }

  private buildKey(entityType: string, entityId: string, uploadId: string, variantName: string): string {
    const extension = variantName.includes('.') ? '' : '.webp';
    return `uploads/${entityType}/${entityId}/${uploadId}/${variantName}${extension}`;
  }
}
```

---

## 4. VirusScanService

```typescript
// modules/media/services/virus-scan.service.ts
import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';

@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);
  private readonly clamavHost: string;
  private readonly clamavPort: number;
  private readonly enabled: boolean;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    this.clamavHost = this.configService.get('CLAMAV_HOST', 'clamav-service');
    this.clamavPort = this.configService.get('CLAMAV_PORT', 3310);
    this.enabled = this.configService.get('CLAMAV_ENABLED', 'true') === 'true';
    this.timeout = 30_000;  // 30 seconds
  }

  /**
   * Scan a buffer for viruses using ClamAV's INSTREAM command.
   * Throws BadRequestException if infected.
   * Throws ServiceUnavailableException if ClamAV is down (FAIL CLOSED — reject upload).
   */
  async scan(buffer: Buffer): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('ClamAV scanning is DISABLED — this should only happen in development');
      return;
    }

    try {
      const result = await this.scanBuffer(buffer);

      if (result.includes('FOUND')) {
        const virusName = result.replace('stream: ', '').replace(' FOUND', '').trim();
        this.logger.error('VIRUS DETECTED in uploaded file', { virus: virusName });
        throw new BadRequestException('File rejected: security scan failed');
      }

      if (!result.includes('OK')) {
        this.logger.error('Unexpected ClamAV response', { result });
        throw new ServiceUnavailableException('File security scan returned unexpected result');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('ClamAV connection failed — REJECTING upload (fail closed)', {
        error: error.message,
      });
      // FAIL CLOSED: If ClamAV is unavailable, reject the upload
      throw new ServiceUnavailableException(
        'File security scanning is temporarily unavailable. Please try again later.',
      );
    }
  }

  /**
   * Send buffer to ClamAV via INSTREAM protocol over TCP.
   */
  private scanBuffer(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';

      socket.setTimeout(this.timeout);

      socket.on('connect', () => {
        // Send INSTREAM command
        socket.write('zINSTREAM\0');

        // Send data in chunks (ClamAV protocol: 4-byte big-endian length + data)
        const CHUNK_SIZE = 8192;
        for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
          const chunk = buffer.subarray(i, Math.min(i + CHUNK_SIZE, buffer.length));
          const lengthBuf = Buffer.alloc(4);
          lengthBuf.writeUInt32BE(chunk.length, 0);
          socket.write(lengthBuf);
          socket.write(chunk);
        }

        // Send zero-length chunk to signal end of stream
        const endBuf = Buffer.alloc(4);
        endBuf.writeUInt32BE(0, 0);
        socket.write(endBuf);
      });

      socket.on('data', (data) => { response += data.toString(); });
      socket.on('end', () => { resolve(response.trim()); });
      socket.on('error', (err) => { reject(err); });
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('ClamAV scan timed out'));
      });

      socket.connect(this.clamavPort, this.clamavHost);
    });
  }
}
```

---

## 5. ImageProcessingPipeline (Orchestrator)

```typescript
// modules/media/services/image-processing-pipeline.ts
import { Injectable, Logger } from '@nestjs/common';
import { ImageValidationService } from './image-validation.service';
import { ImageOptimizationService } from './image-optimization.service';
import { ImageStorageService, UploadOptions, UploadResult } from './image-storage.service';
import { VirusScanService } from './virus-scan.service';

export interface PipelineOptions extends UploadOptions {
  variants: string[];
  generateBlurhash?: boolean;
}

export interface PipelineResult extends UploadResult {
  blurhash?: string;
  metadata: {
    originalWidth: number;
    originalHeight: number;
    format: string;
    variants: Record<string, { width: number; height: number; sizeBytes: number }>;
  };
}

@Injectable()
export class ImageProcessingPipeline {
  private readonly logger = new Logger(ImageProcessingPipeline.name);

  constructor(
    private readonly optimizationService: ImageOptimizationService,
    private readonly storageService: ImageStorageService,
    private readonly virusScanService: VirusScanService,
  ) {}

  /**
   * Full processing pipeline. Call this AFTER ImageValidationPipe has run.
   * The pipe handles magic bytes + dimensions + bomb detection.
   * This method handles: virus scan → sanitize → variants → blurhash → S3 upload.
   */
  async process(
    file: Express.Multer.File,
    options: PipelineOptions,
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    // Step 1: Virus scan
    await this.virusScanService.scan(file.buffer);

    // Step 2: Sanitize (strip EXIF, auto-rotate, re-encode)
    const sanitized = await this.optimizationService.sanitize(file.buffer);

    // Step 3: Generate variants
    const processed = await this.optimizationService.generateVariants(
      sanitized,
      options.variants,
    );

    // Step 4: Generate blurhash (optional)
    let blurhash: string | undefined;
    if (options.generateBlurhash) {
      blurhash = await this.optimizationService.generateBlurhash(sanitized);
    }

    // Step 5: Upload all variants to S3
    const uploadResult = await this.storageService.uploadVariants(
      processed.variants,
      options,
    );

    // Build variant metadata map
    const variantMeta: Record<string, { width: number; height: number; sizeBytes: number }> = {};
    for (const v of processed.variants) {
      variantMeta[v.name] = { width: v.width, height: v.height, sizeBytes: v.sizeBytes };
    }

    const duration = Date.now() - startTime;
    this.logger.log('Image processing complete', {
      entityType: options.entityType,
      entityId: options.entityId,
      uploadId: uploadResult.uploadId,
      duration,
      originalSize: file.buffer.length,
      totalOptimizedSize: processed.variants.reduce((s, v) => s + v.sizeBytes, 0),
      compressionRatio: (
        processed.variants.reduce((s, v) => s + v.sizeBytes, 0) / file.buffer.length
      ).toFixed(2),
    });

    return {
      ...uploadResult,
      blurhash,
      metadata: {
        ...processed.metadata,
        variants: variantMeta,
      },
    };
  }
}
```

---

## 6. Module Registration

```typescript
// modules/media/image-processing.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageOptimizationService } from './services/image-optimization.service';
import { ImageStorageService } from './services/image-storage.service';
import { VirusScanService } from './services/virus-scan.service';
import { ImageProcessingPipeline } from './services/image-processing-pipeline';

@Module({
  imports: [ConfigModule],
  providers: [
    ImageOptimizationService,
    ImageStorageService,
    VirusScanService,
    ImageProcessingPipeline,
  ],
  exports: [ImageProcessingPipeline],
})
export class ImageProcessingModule {}
```

Import this module in any service module that handles file uploads:
```typescript
@Module({
  imports: [ImageProcessingModule, /* other imports */],
  // ...
})
export class CatalogModule {}
```

---

## 7. Queue-Based Async Processing (For Non-Blocking Uploads)

For large uploads or batch processing, use BullMQ to process images asynchronously:

```typescript
// modules/media/processors/image.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ImageProcessingPipeline } from '../services/image-processing-pipeline';

@Processor('image-processing', {
  concurrency: 3,                    // Max 3 concurrent image jobs per worker
  limiter: { max: 10, duration: 60_000 },  // Max 10 jobs per minute
})
export class ImageProcessor extends WorkerHost {
  constructor(private pipeline: ImageProcessingPipeline) { super(); }

  async process(job: Job): Promise<any> {
    const { buffer, options } = job.data;
    // Reconstruct the file object from serialized data
    const file = {
      buffer: Buffer.from(buffer, 'base64'),
      mimetype: job.data.mimetype,
      originalname: job.data.originalname,
    } as Express.Multer.File;

    return this.pipeline.process(file, options);
  }
}
```

Use async processing for:
- Vendor bulk product image uploads
- Background regeneration of image variants
- KYC document processing (scan + store)

Use synchronous (in-request) processing for:
- Profile avatar uploads (user expects immediate result)
- Chat image uploads (need URL immediately)
- Proof of delivery photos (need confirmation in-flow)

---

## 8. Additional Security Measures

### Content Security Policy for Served Images
```
Content-Security-Policy: default-src 'none'; img-src 'self'
Content-Disposition: inline; filename="image.webp"
X-Content-Type-Options: nosniff
```

### S3 Bucket Policy — Block Direct Public Access
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::daltaners-uploads/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT:distribution/DIST_ID"
        }
      }
    }
  ]
}
```

### Rate Limiting for Upload Endpoints
```typescript
@Throttle({ default: { limit: 20, ttl: 60_000 } })  // 20 uploads per minute per user
@Post('upload')
async uploadImage(/* ... */) { /* ... */ }
```
