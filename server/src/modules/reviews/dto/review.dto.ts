import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Rating must be at least 1 star.' })
  @Max(5, { message: 'Rating cannot exceed 5 stars.' })
  rating: number;

  @ApiProperty({ example: 'Stunning everyday shine!' })
  @IsString()
  @IsNotEmpty({ message: 'Please provide a title for your review.' })
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'The gold tone is warm and it has not tarnished.' })
  @IsString()
  @IsNotEmpty({ message: 'Please provide review comments.' })
  @MaxLength(2000)
  comment: string;
}

export class ModerateReviewDto {
  @ApiProperty({ enum: ['pending', 'approved', 'rejected'] })
  @IsIn(['pending', 'approved', 'rejected'])
  status: string;
}

export class FilterReviewsDto {
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'all'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'all'])
  status?: string;

  @IsOptional() @IsString() search?: string;
}
