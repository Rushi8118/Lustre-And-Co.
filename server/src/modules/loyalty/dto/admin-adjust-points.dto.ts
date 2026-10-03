// server/src/modules/loyalty/dto/admin-adjust-points.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminAdjustPointsDto {
  @ApiProperty() @IsUUID() userId!: string;
  @ApiProperty({ example: 100 }) @Type(() => Number) @IsInt() points!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
