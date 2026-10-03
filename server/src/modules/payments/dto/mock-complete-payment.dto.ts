import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const MOCK_OUTCOMES = ['success', 'failed', 'cancelled'] as const;

export class MockCompletePaymentDto {
  @ApiProperty({ example: 'LST-89421056', description: 'System order identifier' })
  @IsString()
  @IsNotEmpty({ message: 'Order ID is required.' })
  orderId: string;

  @ApiProperty({ enum: MOCK_OUTCOMES, description: 'Simulated result (mock mode only)' })
  @IsIn(MOCK_OUTCOMES, { message: 'Outcome must be success, failed or cancelled.' })
  outcome: (typeof MOCK_OUTCOMES)[number];
}
