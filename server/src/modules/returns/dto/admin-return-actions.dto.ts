import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AdminApproveReturnDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupCourier?: string;
}

export class AdminSchedulePickupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdminInspectReturnDto {
  @ApiPropertyOptional({
    enum: ['Passed', 'Failed', 'Partially Approved'],
    default: 'Passed',
  })
  @IsIn(['Passed', 'Failed', 'Partially Approved'])
  inspectionStatus!: 'Passed' | 'Failed' | 'Partially Approved';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inspectionNotes?: string;

  @ApiPropertyOptional({ description: 'Restocking fee to deduct, if applicable' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  restockingFee?: number;
}

export class AdminProcessRefundDto {
  @ApiPropertyOptional({
    enum: ['original_payment', 'store_credit', 'manual_bank_transfer'],
  })
  @IsOptional()
  @IsString()
  refundMethod?: string;

  @ApiPropertyOptional({ description: 'Specific override refund amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customRefundAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class AdminCompleteExchangeDto {
  @ApiPropertyOptional({ description: 'New replacement order number/ID' })
  @IsOptional()
  @IsString()
  exchangeOrderNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class AdminRejectReturnDto {
  @ApiPropertyOptional()
  @IsString()
  rejectionReason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
