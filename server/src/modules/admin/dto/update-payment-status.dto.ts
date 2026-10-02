import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: ['pending', 'paid', 'failed', 'refunded'] })
  @IsIn(['pending', 'paid', 'failed', 'refunded'])
  status: string;
}
