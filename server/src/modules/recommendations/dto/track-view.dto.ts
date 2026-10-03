// server/src/modules/recommendations/dto/track-view.dto.ts
import { IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackViewDto {
  @ApiProperty({ description: 'Product ID being viewed' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Anonymous session identifier' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Time spent on page in milliseconds' })
  @IsOptional()
  @IsNumber()
  durationMs?: number;

  @ApiPropertyOptional({ description: 'Traffic source', example: 'recommendation' })
  @IsOptional()
  @IsString()
  source?: string;
}
