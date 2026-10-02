import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'In Transit', enum: ['Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled'] })
  @IsString()
  @IsNotEmpty({ message: 'Status is required.' })
  @IsIn(['Confirmed', 'Processing', 'In Transit', 'Delivered', 'Cancelled', 'Shipped'], {
    message: 'Status must be Confirmed, Processing, In Transit, Delivered, or Cancelled.',
  })
  status: string;

  @ApiPropertyOptional({ example: 'BD-991823741' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Bluedart Air Express' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ example: 'Handed to courier' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
