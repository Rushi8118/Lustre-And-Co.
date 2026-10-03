import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../../database/supabase.service.js';

export interface UploadableFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface UploadedImageMetadata {
  id?: string;
  url: string;
  storagePath: string;
  fileName: string;
  altText: string;
  order: number;
  isPrimary?: boolean;
  thumbnailUrl: string;
  webpUrl: string;
  size: number;
  mimeType: string;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucketName: string;
  private bucketChecked = false;

  constructor(
    private readonly db: SupabaseService,
    @Optional() private readonly config?: ConfigService,
  ) {
    this.bucketName =
      this.config?.get<string>('SUPABASE_STORAGE_BUCKET') ||
      process.env.SUPABASE_STORAGE_BUCKET ||
      'product-images';
  }

  private async ensureBucketExists(): Promise<void> {
    if (this.bucketChecked) return;

    try {
      const { data: buckets } = await this.db.client.storage.listBuckets();
      const exists = (buckets || []).some((b) => b.name === this.bucketName);

      if (!exists) {
        const { error } = await this.db.client.storage.createBucket(
          this.bucketName,
          {
            public: true,
            fileSizeLimit: MAX_IMAGE_SIZE_BYTES,
            allowedMimeTypes: ALLOWED_MIME_TYPES,
          },
        );

        if (error && !error.message.includes('already exists')) {
          this.logger.warn(`Could not create bucket ${this.bucketName}: ${error.message}`);
        } else {
          this.logger.log(`Created public storage bucket: ${this.bucketName}`);
        }
      }

      this.bucketChecked = true;
    } catch (err: any) {
      this.logger.warn(`Bucket check exception: ${err.message}`);
    }
  }

  validateFile(file: UploadableFile): void {
    if (!file) {
      throw new BadRequestException('No image file was provided.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported image format: ${file.mimetype}. Allowed formats: JPEG, PNG, WebP, SVG, GIF.`,
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException(
        `Image size exceeds maximum limit of 10MB (${(file.size / (1024 * 1024)).toFixed(2)}MB).`,
      );
    }
  }

  async uploadImage(
    file: UploadableFile,
    options: {
      folder?: string;
      altText?: string;
      order?: number;
      productId?: string;
      isPrimary?: boolean;
    } = {},
  ): Promise<UploadedImageMetadata> {
    this.validateFile(file);
    await this.ensureBucketExists();

    const folder = options.folder ? options.folder.replace(/^\/|\/$/g, '') : 'products';
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueName = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const storagePath = `${folder}/${uniqueName}`;

    const { error: uploadError } = await this.db.client.storage
      .from(this.bucketName)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000', // 1 year CDN caching
        upsert: false,
      });

    if (uploadError) {
      this.logger.error(`Storage upload failed: ${uploadError.message}`);
      throw new InternalServerErrorException(
        `Failed to upload image to cloud storage: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = this.db.client.storage
      .from(this.bucketName)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    // Supabase image transformation parameters for WebP & Responsive thumbnails
    const thumbnailUrl = `${publicUrl}?width=320&height=320&format=webp&quality=80`;
    const webpUrl = `${publicUrl}?format=webp&quality=85`;

    const metadata: UploadedImageMetadata = {
      url: publicUrl,
      storagePath,
      fileName: file.originalname,
      altText: options.altText || file.originalname.replace(/\.[^/.]+$/, ''),
      order: options.order ?? 0,
      isPrimary: options.isPrimary ?? false,
      thumbnailUrl,
      webpUrl,
      size: file.size,
      mimeType: file.mimetype,
    };

    if (options.productId) {
      try {
        const { data: imgRow } = await this.db
          .from('product_images')
          .insert({
            product_id: options.productId,
            url: publicUrl,
            storage_path: storagePath,
            alt_text: metadata.altText,
            display_order: metadata.order,
            is_primary: metadata.isPrimary,
            thumbnail_url: thumbnailUrl,
            webp_url: webpUrl,
            file_size: file.size,
            mime_type: file.mimetype,
          })
          .select('id')
          .single();

        if (imgRow) metadata.id = imgRow.id;
      } catch (dbErr: any) {
        this.logger.warn(`Could not persist image record: ${dbErr.message}`);
      }
    }

    return metadata;
  }

  async uploadMultiple(
    files: UploadableFile[],
    options: {
      folder?: string;
      productId?: string;
      altPrefix?: string;
    } = {},
  ): Promise<UploadedImageMetadata[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided for upload.');
    }

    const results = await Promise.all(
      files.map((file, idx) =>
        this.uploadImage(file, {
          folder: options.folder,
          order: idx,
          isPrimary: idx === 0,
          productId: options.productId,
          altText: options.altPrefix ? `${options.altPrefix} - Angle ${idx + 1}` : undefined,
        }),
      ),
    );

    return results;
  }

  async deleteImage(pathOrUrl: string): Promise<{ success: boolean; path: string }> {
    if (!pathOrUrl) {
      throw new BadRequestException('Path or URL is required for deletion.');
    }

    let storagePath = pathOrUrl;
    if (pathOrUrl.startsWith('http')) {
      const match = pathOrUrl.split(`${this.bucketName}/`)[1];
      if (match) {
        storagePath = decodeURIComponent(match.split('?')[0]);
      }
    }

    const { error } = await this.db.client.storage
      .from(this.bucketName)
      .remove([storagePath]);

    if (error) {
      this.logger.warn(`Storage delete error for ${storagePath}: ${error.message}`);
    }

    try {
      await this.db
        .from('product_images')
        .delete()
        .or(`storage_path.eq.${storagePath},url.eq.${pathOrUrl}`);
    } catch {
      // non-fatal
    }

    return { success: !error, path: storagePath };
  }

  async listProductImages(productId: string): Promise<UploadedImageMetadata[]> {
    const { data, error } = await this.db
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('display_order', { ascending: true });

    if (error) return [];

    return (data || []).map((row: any) => ({
      id: row.id,
      url: row.url,
      storagePath: row.storage_path,
      fileName: row.alt_text || 'product-image',
      altText: row.alt_text || '',
      order: row.display_order || 0,
      isPrimary: Boolean(row.is_primary),
      thumbnailUrl: row.thumbnail_url || row.url,
      webpUrl: row.webp_url || row.url,
      size: row.file_size || 0,
      mimeType: row.mime_type || 'image/jpeg',
    }));
  }

  async reorderImages(
    productId: string,
    imageOrders: Array<{ id: string; order: number; isPrimary?: boolean }>,
  ): Promise<boolean> {
    for (const item of imageOrders) {
      await this.db
        .from('product_images')
        .update({
          display_order: item.order,
          is_primary: Boolean(item.isPrimary),
        })
        .eq('id', item.id)
        .eq('product_id', productId);
    }
    return true;
  }
}
