import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Eleanor Vance', description: 'Full name of the customer' })
  @IsString()
  @IsNotEmpty({ message: 'Please enter your name.' })
  name: string;

  @ApiProperty({ example: 'eleanor@example.com', description: 'Unique email address' })
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Please enter your email address.' })
  email: string;

  @ApiProperty({ example: 'SecretPassword123!', description: 'Password (min 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;
}
