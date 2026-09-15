import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, Address, PRIVATE_USER_FIELDS } from './schemas/user.schema.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const newUser = new this.userModel({
      ...userData,
      email: userData.email?.toLowerCase().trim(),
    });
    return newUser.save();
  }

  async getProfile(userId: string | Types.ObjectId): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).select(PRIVATE_USER_FIELDS);
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return user;
  }

  async updateProfile(
    userId: string | Types.ObjectId,
    updateDto: UpdateProfileDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateDto }, { returnDocument: 'after' })
      .select(PRIVATE_USER_FIELDS);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user;
  }

  async changePassword(userId: string | Types.ObjectId, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      throw new BadRequestException('Your current password is incorrect.');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await user.save();
    return { success: true, message: 'Your password has been updated.' };
  }

  async addAddress(
    userId: string | Types.ObjectId,
    dto: CreateAddressDto,
  ): Promise<Address[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (dto.isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    } else if (user.addresses.length === 0) {
      dto.isDefault = true;
    }

    user.addresses.push(dto as Address);
    await user.save();
    return user.addresses;
  }

  async setDefaultAddress(userId: string | Types.ObjectId, addressId: string): Promise<Address[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const target = user.addresses.find((addr: any) => addr._id?.toString() === addressId);
    if (!target) {
      throw new NotFoundException('Address not found.');
    }

    user.addresses.forEach((addr: any) => {
      addr.isDefault = addr._id?.toString() === addressId;
    });
    await user.save();
    return user.addresses;
  }

  async removeAddress(
    userId: string | Types.ObjectId,
    addressId: string,
  ): Promise<Address[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const initialLength = user.addresses.length;
    user.addresses = user.addresses.filter(
      (addr: any) => addr._id?.toString() !== addressId && addr.id !== addressId,
    );

    if (user.addresses.length === initialLength) {
      throw new NotFoundException('Address not found.');
    }

    // Ensure at least one address is default if any remain
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return user.addresses;
  }
}
