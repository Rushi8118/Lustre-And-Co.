import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CONTACT_REASONS = [
  'Order status',
  'Product question',
  'Returns and exchanges',
  'Payment issue',
  'Other',
];

export class CreateContactMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Please enter your name.' })
  @MaxLength(120)
  name: string;

  @ApiProperty() @IsEmail({}, { message: 'Please enter a valid email address.' }) email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional({ enum: CONTACT_REASONS }) @IsOptional() @IsIn(CONTACT_REASONS) reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) orderId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Please enter a message.' })
  @MaxLength(5000)
  message: string;
}

export class UpdateContactMessageDto {
  @IsOptional() @IsIn(['new', 'read', 'replied', 'archived']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) adminNote?: string;
}

export class SubscribeDto {
  @ApiProperty() @IsEmail({}, { message: 'Please enter a valid email address.' }) email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) source?: string;
}

export class UpdateSubscriberDto {
  @IsBoolean() isActive: boolean;
}
