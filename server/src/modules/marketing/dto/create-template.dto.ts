import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  templateKey!: string;

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

  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  preheader?: string;

  @ApiProperty()
  @IsString()
  htmlBody!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
