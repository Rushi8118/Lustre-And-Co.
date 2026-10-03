import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/is-strong-password.validator.js';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use token from the password reset link' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is missing.' })
  token: string;

  @ApiProperty({ description: 'New password (min 8 characters with upper, lower, digit, symbol)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsStrongPassword()
  password: string;
}
