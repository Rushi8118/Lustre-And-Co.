import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterProductsDto {
  @ApiPropertyOptional({ example: 'necklaces', description: 'Filter by category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'everyday', description: 'Filter by collection (everyday, bridal, party, festive)' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ example: 'bridal', description: 'Filter by occasion' })
  @IsOptional()
  @IsString()
  occasion?: string;

  @ApiPropertyOptional({ example: '18K Gold Plated', description: 'Filter by jewelry finish' })
  @IsOptional()
  @IsString()
  finish?: string;

  @ApiPropertyOptional({ example: 'new', description: 'Filter by tag (new, bestseller, ...)' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Only featured products' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: 500, description: 'Minimum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional({ example: 3000, description: 'Maximum price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({
    enum: ['price-asc', 'price-desc', 'rating', 'newest', 'popular'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sort?: 'price-asc' | 'price-desc' | 'rating' | 'newest' | 'popular';

  @ApiPropertyOptional({ example: 'aurora', description: 'Search keywords' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12, description: 'Items per page (max 200)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 12;
}
