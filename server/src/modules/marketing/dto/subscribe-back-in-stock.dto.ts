import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class SubscribeBackInStockDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: ['email', 'sms', 'whatsapp'],
    default: 'email',
  })
  @IsOptional()
  @IsIn(['email', 'sms', 'whatsapp'])
  channel?: 'email' | 'sms' | 'whatsapp';
}
