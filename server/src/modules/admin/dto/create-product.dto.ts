import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminCreateProductDto {
  @ApiProperty({ example: 'Celeste Pearl Drop Earrings' })
  @IsString()
  @IsNotEmpty({ message: 'Product name is required.' })
  name: string;

  @ApiProperty({ example: 'earrings', description: 'Slug of an existing category' })
  @IsString()
  @IsNotEmpty({ message: 'Category is required.' })
  category: string;

  @ApiPropertyOptional({ example: 'LC-EAR-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'bridal', default: 'everyday' })
  @IsOptional()
  @IsString()
  collectionName?: string;

  @ApiPropertyOptional({ enum: ['everyday', 'bridal', 'party', 'festive'] })
  @IsOptional()
  @IsIn(['everyday', 'bridal', 'party', 'festive'])
  occasion?: string;

  @ApiProperty({ example: 1499 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Price cannot be negative.' })
  price: number;

  @ApiPropertyOptional({ example: 2199, nullable: true, description: 'Strikethrough price; null clears it' })
  @IsOptional()
  @ValidateIf((o) => o.oldPrice !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  oldPrice?: number | null;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Stock cannot be negative.' })
  stockQuantity: number;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908' })
  @IsString()
  @IsNotEmpty({ message: 'Primary image URL is required.' })
  image: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '18K Gold Plated' })
  @IsOptional()
  @IsString()
  finish?: string;

  @ApiPropertyOptional({ example: 'Gold-plated brass' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: ['Gold', 'Rose gold', 'Silver'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableColors?: string[];

  @ApiPropertyOptional({ example: ['Standard (16" + 2")'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableSizes?: string[];

  @ApiPropertyOptional({ example: 'Bestseller', description: 'Empty string clears the badge' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) details?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) care?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) shipping?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) returns?: string[];

  @ApiPropertyOptional({ example: ['new', 'bestseller'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() isFeatured?: boolean;
}
