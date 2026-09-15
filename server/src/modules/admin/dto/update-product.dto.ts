import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AdminCreateProductDto } from './create-product.dto.js';

export class AdminUpdateProductDto extends PartialType(AdminCreateProductDto) {
  @ApiPropertyOptional({ enum: ['in-stock', 'out-of-stock'] })
  @IsOptional()
  @IsIn(['in-stock', 'out-of-stock'])
  availability?: string;
}
