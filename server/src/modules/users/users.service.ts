import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { type Address, type User, type UserDocument, USER_PUBLIC_COLUMNS } from './schemas/user.schema.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { isUuid, toDoc, unwrap } from '../../common/utils/db.js';

@Injectable()
export class UsersService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  async findById(id: string): Promise<UserDocument | null> {
    if (!isUuid(id)) return null;
    const user = unwrap(await this.db.from('users').select('*').eq('id', id).maybeSingle());
    return user ? toDoc(user) : null;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const user = unwrap(
      await this.db.from('users').select('*').eq('email', email.toLowerCase().trim()).maybeSingle(),
    );
    return user ? toDoc(user) : null;
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = unwrap(
      await this.db
        .from('users')
        .insert({ ...userData, email: userData.email?.toLowerCase().trim() })
        .select()
        .single(),
    );
    return toDoc(user);
  }

  async touchLastLogin(userId: string) {
    unwrap(await this.db.from('users').update({ lastLoginAt: new Date().toISOString() }).eq('id', userId));
  }

  async getProfile(userId: string) {
    const user = isUuid(userId)
      ? unwrap(await this.db.from('users').select(USER_PUBLIC_COLUMNS).eq('id', userId).maybeSingle())
      : null;
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }
    return toDoc(user);
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = unwrap(
      await this.db.from('users').update(updateDto).eq('id', userId).select(USER_PUBLIC_COLUMNS).maybeSingle(),
    );
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return toDoc(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const matches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!matches) {
      throw new BadRequestException('Your current password is incorrect.');
    }

    unwrap(
      await this.db.from('users').update({ password: await bcrypt.hash(dto.newPassword, 10) }).eq('id', user.id),
    );
    return { success: true, message: 'Your password has been updated.' };
  }

  private async getAddresses(userId: string): Promise<Address[]> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user.addresses || [];
  }

  private async saveAddresses(userId: string, addresses: Address[]): Promise<Address[]> {
    unwrap(await this.db.from('users').update({ addresses }).eq('id', userId));
    return addresses;
  }

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address[]> {
    const addresses = await this.getAddresses(userId);

    if (dto.isDefault) {
      addresses.forEach((addr) => {
        addr.isDefault = false;
      });
    } else if (addresses.length === 0) {
      dto.isDefault = true;
    }

    addresses.push({
      country: 'India',
      isDefault: false,
      ...dto,
      _id: crypto.randomUUID(),
    } as Address);
    return this.saveAddresses(userId, addresses);
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<Address[]> {
    const addresses = await this.getAddresses(userId);

    const target = addresses.find((addr) => addr._id === addressId);
    if (!target) {
      throw new NotFoundException('Address not found.');
    }

    addresses.forEach((addr) => {
      addr.isDefault = addr._id === addressId;
    });
    return this.saveAddresses(userId, addresses);
  }

  async removeAddress(userId: string, addressId: string): Promise<Address[]> {
    const addresses = await this.getAddresses(userId);

    const remaining = addresses.filter(
      (addr: any) => addr._id !== addressId && addr.id !== addressId,
    );

    if (remaining.length === addresses.length) {
      throw new NotFoundException('Address not found.');
    }

    // Ensure at least one address is default if any remain
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
    }

    return this.saveAddresses(userId, remaining);
  }
}
