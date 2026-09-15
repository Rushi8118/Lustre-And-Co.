import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema.js';
import { DEFAULT_SETTINGS, SETTINGS_SECTIONS, StoreSettings } from './settings.defaults.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { getRazorpayCredentials } from '../../common/utils/payments.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema.js';

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep-merges `override` onto `base`; arrays and primitives in `override` replace base values. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const result: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    result[key] =
      isPlainObject(value) && isPlainObject(result[key]) ? deepMerge(result[key], value) : value;
  }
  return result as T;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectModel(Settings.name) private readonly settingsModel: Model<SettingsDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.settingsModel.updateOne(
      { key: 'store' },
      { $setOnInsert: { key: 'store', ...DEFAULT_SETTINGS } },
      { upsert: true },
    );
  }

  /** Full settings with defaults filled in for any section or field not yet saved. */
  async get(): Promise<StoreSettings> {
    const doc = await this.settingsModel.findOne({ key: 'store' }).lean().exec();
    const saved: Record<string, any> = {};
    for (const section of SETTINGS_SECTIONS) {
      if (doc?.[section]) saved[section] = doc[section];
    }
    return deepMerge(DEFAULT_SETTINGS, saved);
  }

  async getCommerce() {
    return (await this.get()).commerce;
  }

  async getPublic() {
    const [settings, customerCount, ratingStats] = await Promise.all([
      this.get(),
      this.userModel.countDocuments({ role: 'customer' }).exec(),
      this.reviewModel
        .aggregate([
          { $match: { status: 'approved' } },
          { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const { configured, keyId } = getRazorpayCredentials(this.configService);

    return {
      ...settings,
      payments: {
        onlineEnabled: configured,
        razorpayKeyId: configured ? keyId : null,
        codEnabled: settings.commerce.codEnabled,
      },
      stats: {
        customerCount,
        reviewCount: ratingStats[0]?.count || 0,
        averageRating: ratingStats[0]?.average ? Number(ratingStats[0].average.toFixed(1)) : null,
      },
    };
  }

  async update(dto: UpdateSettingsDto): Promise<StoreSettings> {
    const current = await this.get();
    const next = deepMerge(current, dto);
    await this.settingsModel.updateOne({ key: 'store' }, { $set: next }, { upsert: true }).exec();
    return next;
  }
}
