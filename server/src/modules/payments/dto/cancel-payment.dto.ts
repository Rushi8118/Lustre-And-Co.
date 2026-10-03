import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelPaymentDto {
  @ApiProperty({ example: 'LST-89421056', description: 'System order identifier' })
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required.' })
  orderId: string;
}
