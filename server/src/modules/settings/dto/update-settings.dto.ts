import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class StoreSettingsDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @ValidateIf((o) => o.supportEmail !== '') @IsEmail() supportEmail?: string;
  @IsOptional() @IsString() supportPhone?: string;
  @IsOptional() @IsString() whatsappNumber?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() hours?: string;
}

class SocialSettingsDto {
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() youtube?: string;
  @IsOptional() @IsString() whatsapp?: string;
}

class CommerceSettingsDto {
  @IsOptional() @IsIn(['INR', 'USD']) currency?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) freeShippingThreshold?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) shippingFee?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) expressShippingFee?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) taxPercent?: number;
  @IsOptional() @IsBoolean() codEnabled?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) returnWindowDays?: number;
  @IsOptional() @IsString() dispatchTime?: string;
  @IsOptional() @IsString() standardDelivery?: string;
  @IsOptional() @IsString() expressDelivery?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsBoolean() autoApproveReviews?: boolean;
}

class AnnouncementSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) messages?: string[];
}

class SectionHeadingDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
}

class HeroDto {
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() highlight?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() primaryCtaLabel?: string;
  @IsOptional() @IsString() primaryCtaLink?: string;
  @IsOptional() @IsString() secondaryCtaLabel?: string;
  @IsOptional() @IsString() secondaryCtaLink?: string;
  @IsOptional() @IsString() cardEyebrow?: string;
  @IsOptional() @IsString() cardTitle?: string;
  @IsOptional() @IsString() cardText?: string;
}

class EditorialDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaLink?: string;
  @IsOptional() @IsString() image?: string;
}

class PromoDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() heading?: string;
  @IsOptional() @IsString() highlight?: string;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaLink?: string;
  @IsOptional() @IsString() image?: string;
  @IsOptional() @IsString() tagTitle?: string;
  @IsOptional() @IsString() tagText?: string;
}

class TestimonialDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() eyebrow?: string;
  @IsOptional() @IsString() quote?: string;
  @IsOptional() @IsString() author?: string;
}

class HomepageSettingsDto {
  @IsOptional() @ValidateNested() @Type(() => HeroDto) hero?: HeroDto;
  @IsOptional() @ValidateNested() @Type(() => SectionHeadingDto) categoriesSection?: SectionHeadingDto;
  @IsOptional() @ValidateNested() @Type(() => SectionHeadingDto) newArrivalsSection?: SectionHeadingDto;
  @IsOptional() @ValidateNested() @Type(() => SectionHeadingDto) bestSellersSection?: SectionHeadingDto;
  @IsOptional() @ValidateNested() @Type(() => EditorialDto) editorial?: EditorialDto;
  @IsOptional() @ValidateNested() @Type(() => PromoDto) promo?: PromoDto;
  @IsOptional() @ValidateNested() @Type(() => TestimonialDto) testimonial?: TestimonialDto;
}

class NewsletterSettingsDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() kicker?: string;
  @IsOptional() @IsString() heading?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() couponCode?: string;
}

class SeoSettingsDto {
  @IsOptional() @IsString() metaTitle?: string;
  @IsOptional() @IsString() metaDescription?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => StoreSettingsDto) store?: StoreSettingsDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => SocialSettingsDto) social?: SocialSettingsDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => CommerceSettingsDto) commerce?: CommerceSettingsDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => AnnouncementSettingsDto) announcement?: AnnouncementSettingsDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => HomepageSettingsDto) homepage?: HomepageSettingsDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => NewsletterSettingsDto) newsletter?: NewsletterSettingsDto;
  @ApiPropertyOptional() @IsOptional() @ValidateNested() @Type(() => SeoSettingsDto) seo?: SeoSettingsDto;
}
