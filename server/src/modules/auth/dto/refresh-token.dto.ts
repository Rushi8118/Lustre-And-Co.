import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token. Optional: browsers send it in the lc_refresh cookie instead.',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
