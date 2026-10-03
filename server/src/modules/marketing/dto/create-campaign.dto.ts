import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({
    enum: [
      'newsletter',
      'new_product',
      'sale',
      'order_update',
      'abandoned_cart',
      'review_request',
      'back_in_stock',
    ],
  })
  @IsIn([
    'newsletter',
    'new_product',
    'sale',
    'order_update',
    'abandoned_cart',
    'review_request',
    'back_in_stock',
  ])
  campaignType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  audienceFilter?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
