import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ReleaseReservationDto {
  @ApiPropertyOptional({ enum: ['released','expired','cancelled'], default: 'released' })
  @IsOptional() @IsIn(['released','expired','cancelled'])
  status?: 'released' | 'expired' | 'cancelled';
}
