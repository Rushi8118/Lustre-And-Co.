// server/src/modules/loyalty/dto/redeem-points.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RedeemPointsDto {
  @ApiProperty({ example: 500 }) @Type(() => Number) @IsInt() @Min(1) points!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() idempotencyKey?: string;
}
