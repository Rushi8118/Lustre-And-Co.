import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

class PageSectionItemDto {
  @IsString() title: string;
  @IsString() text: string;
}

class PageSectionDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() heading?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) bullets?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageSectionItemDto)
  items?: PageSectionItemDto[];

  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaLink?: string;
}

export class CreatePageDto {
  @ApiProperty({ example: 'about' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug may only contain lowercase letters, numbers, and hyphens.',
  })
  slug: string;

  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() eyebrow?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ type: [PageSectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageSectionDto)
  sections?: PageSectionDto[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class UpdatePageDto extends PartialType(CreatePageDto) {}

export class CreateFaqDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Question is required.' }) question: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Answer is required.' }) answer: string;
  @ApiProperty({ example: 'Orders' }) @IsString() @IsNotEmpty() group: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
