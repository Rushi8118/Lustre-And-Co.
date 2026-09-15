import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../users/schemas/user.schema.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:5000/api/auth/google/callback',
      scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any): Promise<UserDocument> {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';

    if (!email) {
      throw new UnauthorizedException('Google account email not found.');
    }

    let user = await this.userModel.findOne({ googleId }).select('+googleId');

    if (user) {
      user.lastLoginAt = new Date();
      await user.save();
      return user;
    }

    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      existingByEmail.googleId = googleId;
      existingByEmail.provider = 'google';
      existingByEmail.lastLoginAt = new Date();
      await existingByEmail.save();
      return existingByEmail;
    }

    const hashedPassword = await bcrypt.hash(
      `${googleId}-${Date.now()}`,
      10,
    );

    user = new this.userModel({
      name: name || `${firstName} ${lastName}`.trim(),
      email: email.toLowerCase().trim(),
      googleId,
      provider: 'google',
      password: hashedPassword,
      role: 'customer',
      addresses: [],
      lastLoginAt: new Date(),
    });
    await user.save();

    return user;
  }
}
