import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminFilterCustomersDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;

  @ApiPropertyOptional({ enum: ['all', 'customer', 'admin'] })
  @IsOptional()
  @IsIn(['all', 'customer', 'admin'])
  role?: string;

  @ApiPropertyOptional({ enum: ['all', 'active', 'inactive'] })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status?: string;

  @IsOptional() @Type(() => Number) @IsNumber() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number = 50;
}

export class AdminCreateUserDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Name is required.' }) name: string;
  @ApiProperty() @IsEmail({}, { message: 'Please enter a valid email address.' }) email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @ApiPropertyOptional({ enum: ['customer', 'admin'] })
  @IsOptional()
  @IsIn(['customer', 'admin'])
  role?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}

export class AdminUpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: ['customer', 'admin'] }) @IsOptional() @IsIn(['customer', 'admin']) role?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ description: 'Set a new password for the user' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password?: string;
}

export class AdminDashboardQueryDto {
  @ApiPropertyOptional({ enum: [7, 30, 90], default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30, 90])
  days?: number = 7;
}

export class AdminFilterPaymentsDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['all', 'pending', 'paid', 'failed', 'refunded']) status?: string;
}
