import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { UserDocument } from './schemas/user.schema.js';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current customer profile and saved addresses' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.usersService.getProfile(user._id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update customer name and phone' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user._id, dto);
  }

  @Put('password')
  @ApiOperation({ summary: 'Change password (requires the current password)' })
  async changePassword(@CurrentUser() user: UserDocument, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user._id, dto);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new shipping address' })
  @ApiResponse({ status: 201, description: 'Address saved successfully.' })
  async addAddress(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.addAddress(user._id, dto);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Mark a saved address as the default shipping address' })
  async setDefaultAddress(@CurrentUser() user: UserDocument, @Param('id') addressId: string) {
    return this.usersService.setDefaultAddress(user._id, addressId);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete a saved shipping address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully.' })
  async removeAddress(
    @CurrentUser() user: UserDocument,
    @Param('id') addressId: string,
  ) {
    return this.usersService.removeAddress(user._id, addressId);
  }
}
