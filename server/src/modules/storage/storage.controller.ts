import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { StorageService } from './storage.service.js';

@ApiTags('Storage')
@Controller()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @AdminOnly()
  @Post('admin/storage/upload')
  @ApiOperation({ summary: 'Upload single image to Supabase cloud storage' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Body('folder') folder?: string,
    @Body('altText') altText?: string,
    @Body('productId') productId?: string,
    @Body('order') order?: string,
  ) {
    return this.storageService.uploadImage(file, {
      folder,
      altText,
      productId,
      order: order ? Number(order) : undefined,
    });
  }

  @AdminOnly()
  @Post('admin/storage/upload-multiple')
  @ApiOperation({ summary: 'Upload multiple product gallery images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 12))
  async uploadMultiple(
    @UploadedFiles() files: any[],
    @Body('folder') folder?: string,
    @Body('productId') productId?: string,
    @Body('altPrefix') altPrefix?: string,
  ) {
    return this.storageService.uploadMultiple(files, {
      folder,
      productId,
      altPrefix,
    });
  }

  @AdminOnly()
  @Delete('admin/storage/file')
  @ApiOperation({ summary: 'Delete image from Supabase cloud storage' })
  async deleteFile(@Body('url') url: string) {
    return this.storageService.deleteImage(url);
  }

  @Get('storage/product/:productId')
  @ApiOperation({ summary: 'List all cloud gallery images for a product' })
  async getProductImages(@Param('productId') productId: string) {
    return this.storageService.listProductImages(productId);
  }

  @AdminOnly()
  @Put('admin/storage/product/:productId/reorder')
  @ApiOperation({ summary: 'Update image ordering and primary image flag' })
  async reorderImages(
    @Param('productId') productId: string,
    @Body() body: { items: Array<{ id: string; order: number; isPrimary?: boolean }> },
  ) {
    return this.storageService.reorderImages(productId, body.items || []);
  }
}
