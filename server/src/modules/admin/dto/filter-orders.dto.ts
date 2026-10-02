import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminFilterOrdersDto {
  @ApiPropertyOptional({ example: 'Processing', description: 'Order status, or "all"' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['all', 'pending', 'paid', 'failed', 'refunded'] })
  @IsOptional()
  @IsIn(['all', 'pending', 'paid', 'failed', 'refunded'])
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'Eleanor', description: 'Search order ID, customer name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;
}
