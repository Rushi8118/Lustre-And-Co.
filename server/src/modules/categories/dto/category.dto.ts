import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Anklets' })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required.' })
  name: string;

  @ApiPropertyOptional({ example: 'anklets', description: 'URL slug; generated from name when omitted' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug may only contain lowercase letters, numbers, and hyphens.',
  })
  slug?: string;

  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @Type(() => Number) @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() showInMenu?: boolean;
  @IsOptional() @IsBoolean() showOnHome?: boolean;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
