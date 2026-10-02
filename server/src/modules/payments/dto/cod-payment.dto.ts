import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CodPaymentDto {
  @ApiProperty({
    example: 'LST-89421056',
    description: 'Order ID to mark as Cash on Delivery',
  })
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required.' })
  orderId: string;
}
