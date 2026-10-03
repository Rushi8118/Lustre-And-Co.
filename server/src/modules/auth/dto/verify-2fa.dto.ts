import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2faDto {
  @ApiProperty({ description: 'Temporary pre-auth session token' })
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @Length(6, 6, { message: '2FA code must be exactly 6 digits.' })
  code!: string;
}
