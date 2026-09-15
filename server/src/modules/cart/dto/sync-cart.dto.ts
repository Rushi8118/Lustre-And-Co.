import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AddCartItemDto } from './add-cart-item.dto.js';

export class SyncCartDto {
  @ApiProperty({ type: [AddCartItemDto], description: 'Guest localStorage items to merge into server cart' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddCartItemDto)
  items: AddCartItemDto[];
}
