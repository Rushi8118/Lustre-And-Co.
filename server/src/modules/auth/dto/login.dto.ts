import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'eleanor@example.com', description: 'Registered email address' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Please enter your email address.' })
  email: string;

  @ApiProperty({ example: 'SecretPassword123!', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your password.' })
  password: string;
}
