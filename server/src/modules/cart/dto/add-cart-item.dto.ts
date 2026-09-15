import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ example: 'aurora-gold-plated-necklace', description: 'Product ID or slug' })
  @IsString()
  @IsNotEmpty({ message: 'Product identifier is required.' })
  productId: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Quantity to add/update' })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1.' })
  quantity?: number = 1;

  @ApiPropertyOptional({ example: 'Gold', default: 'Gold', description: 'Selected color variant' })
  @IsOptional()
  @IsString()
  selectedColor?: string = 'Gold';

  @ApiPropertyOptional({ example: 'Standard (16" + 2")', description: 'Selected size variant' })
  @IsOptional()
  @IsString()
  selectedSize?: string;
}
