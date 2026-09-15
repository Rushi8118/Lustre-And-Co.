import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Eleanor Vance', description: 'Updated customer name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '+91 9876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
