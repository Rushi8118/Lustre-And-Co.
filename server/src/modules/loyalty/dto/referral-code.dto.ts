// server/src/modules/loyalty/dto/referral-code.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ReferralCodeDto {
  @ApiProperty({ example: 'LUSTRE-AB12CD' }) @IsString() @MinLength(3) code!: string;
}
