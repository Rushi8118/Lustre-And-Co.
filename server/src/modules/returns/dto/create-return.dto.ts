import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReturnItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exchangeColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  exchangeSize?: string;
}

export class ReturnPickupAddressDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty()
  @IsString()
  phone!: string;

  @ApiProperty()
  @IsString()
  addressLine1!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty()
  @IsString()
  postalCode!: string;

  @ApiPropertyOptional({ default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ description: 'Order ID or Order Number' })
  @IsString()
  orderIdentifier!: string;

  @ApiProperty({ enum: ['return', 'exchange'], default: 'return' })
  @IsIn(['return', 'exchange'])
  requestType!: 'return' | 'exchange';

  @ApiProperty({
    example: 'Size did not fit',
    description: 'Primary reason for return or exchange',
  })
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional feedback or notes' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Photo proof URLs or base64 data URLs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({
    enum: ['original_payment', 'store_credit'],
    default: 'original_payment',
  })
  @IsOptional()
  @IsIn(['original_payment', 'store_credit'])
  refundPreference?: 'original_payment' | 'store_credit';

  @ApiPropertyOptional({ type: ReturnPickupAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReturnPickupAddressDto)
  pickupAddress?: ReturnPickupAddressDto;
}
