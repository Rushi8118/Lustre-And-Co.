// server/src/modules/loyalty/dto/update-birthday.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateBirthdayDto {
  @ApiProperty({ example: 6 }) @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @ApiProperty({ example: 15 }) @Type(() => Number) @IsInt() @Min(1) @Max(31) day!: number;
  @ApiProperty({ example: 1995 }) @Type(() => Number) @IsInt() @Min(1900) @Max(2100) year!: number;
}
