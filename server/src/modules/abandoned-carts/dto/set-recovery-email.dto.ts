import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class SetRecoveryEmailDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ enum: [1, 2], default: 1 })
  @IsOptional()
  @IsIn([1, 2])
  reminderNumber?: 1 | 2;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customMessage?: string;
}
