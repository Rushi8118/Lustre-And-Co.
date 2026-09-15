import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Product, ProductDocument } from '../modules/products/schemas/product.schema.js';
import { Coupon, CouponDocument } from '../modules/discounts/schemas/coupon.schema.js';
import { User, UserDocument } from '../modules/users/schemas/user.schema.js';
import { Category, CategoryDocument } from '../modules/categories/schemas/category.schema.js';
import { Review, ReviewDocument } from '../modules/reviews/schemas/review.schema.js';
import { Page, PageDocument } from '../modules/cms/schemas/page.schema.js';
import { Faq, FaqDocument } from '../modules/cms/schemas/faq.schema.js';
import { ReviewsService } from '../modules/reviews/reviews.service.js';
import { SEED_CATEGORIES, SEED_COUPONS, SEED_FAQS, SEED_PAGES } from './seed-data/content.data.js';

/**
 * Idempotent seeding. Everything is insert-only ($setOnInsert), so re-running the seed
 * never overwrites changes made through the admin panel.
 */
@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Page.name) private readonly pageModel: Model<PageDocument>,
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
    @Inject(ReviewsService) private readonly reviewsService: ReviewsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async seed(productsData: any[]) {
    await this.seedCategories();
    await this.seedProducts(productsData);
    await this.migrateEmbeddedReviews(productsData);
    await this.seedCoupons();
    await this.seedContent();
    await this.seedAdmin();
    this.logger.log('✨ Database ready.');
  }

  private async seedCategories() {
    for (const category of SEED_CATEGORIES) {
      await this.categoryModel.updateOne({ slug: category.slug }, { $setOnInsert: category }, { upsert: true });
    }
    this.logger.log(`✅ Categories ensured (${SEED_CATEGORIES.length}).`);
  }

  private async seedProducts(productsData: any[]) {
    let inserted = 0;
    for (const item of productsData) {
      const sku =
        item.details?.find((d: string) => d.startsWith('SKU:'))?.replace('SKU:', '').trim() ||
        `LC-${item.category.slice(0, 3).toUpperCase()}-${item.id.replace(/\D/g, '').padStart(3, '0')}`;

      const payload = {
        slug: item.slug,
        name: item.name,
        sku,
        category: item.category,
        collectionName: item.collection || 'everyday',
        occasion: item.occasion || 'everyday',
        price: item.price,
        oldPrice: item.oldPrice,
        badge: item.badge,
        finish: item.finish || '18K Gold Plated',
        material: item.material || 'Gold-plated brass',
        availableColors: item.availableColors || (item.color ? [item.color] : ['Gold']),
        availableSizes: item.availableSizes || ['Standard'],
        availability: 'in-stock',
        stockQuantity: item.stockQuantity ?? 50,
        salesCount: 0,
        image: item.image,
        gallery: item.gallery || [item.image],
        description: item.description,
        details: item.details || [],
        care: item.care || [],
        shipping: item.shipping || [],
        returns: item.returns || [],
        tags: item.tags || [],
        isActive: true,
        isFeatured: false,
        rating: 0,
        reviews: 0,
      };

      const result = await this.productModel.updateOne({ slug: item.slug }, { $setOnInsert: payload }, { upsert: true });
      if (result.upsertedCount) inserted++;

      // Backfill fields introduced after the first seed, without touching admin edits.
      for (const [field, value] of Object.entries({ sku, occasion: payload.occasion, isActive: true, isFeatured: false, salesCount: 0 })) {
        await this.productModel.updateOne({ slug: item.slug, [field]: { $exists: false } }, { $set: { [field]: value } });
      }
    }
    this.logger.log(`✅ Products ensured (${inserted} new, ${productsData.length - inserted} existing kept).`);
  }

  /** Moves legacy product.customerReviews into the reviews collection and recomputes real ratings. */
  private async migrateEmbeddedReviews(productsData: any[]) {
    const legacyBySlug = new Map(productsData.map((p) => [p.slug, p.customerReviews || []]));
    const products = await this.productModel.find().select('+customerReviews slug').exec();
    let migrated = 0;

    for (const product of products) {
      const alreadyMigrated = await this.reviewModel.exists({ product: product._id });
      const legacy = (product.customerReviews?.length ? product.customerReviews : legacyBySlug.get(product.slug)) || [];

      if (!alreadyMigrated && legacy.length) {
        await this.reviewModel.insertMany(
          legacy.map((r: any) => ({
            product: product._id,
            author: r.author,
            rating: r.rating,
            title: r.title || 'Review',
            comment: r.comment,
            status: 'approved',
            verifiedPurchase: false,
          })),
        );
        migrated += legacy.length;
      }

      await this.productModel.updateOne({ _id: product._id }, { $unset: { customerReviews: '' } });
      await this.reviewsService.recalculateProductRating(product._id as any);
    }
    this.logger.log(`✅ Reviews migrated (${migrated}); product ratings recalculated from approved reviews.`);
  }

  private async seedCoupons() {
    for (const coupon of SEED_COUPONS) {
      await this.couponModel.updateOne({ code: coupon.code }, { $setOnInsert: coupon }, { upsert: true });
    }
    await this.couponModel.updateMany({ usedCount: { $exists: false } }, { $set: { usedCount: 0, usageLimit: 0 } });
    this.logger.log(`✅ Coupons ensured (${SEED_COUPONS.map((c) => c.code).join(', ')}).`);
  }

  private async seedContent() {
    for (const page of SEED_PAGES) {
      await this.pageModel.updateOne({ slug: page.slug }, { $setOnInsert: page }, { upsert: true });
    }
    if ((await this.faqModel.estimatedDocumentCount()) === 0) {
      await this.faqModel.insertMany(SEED_FAQS);
    }
    this.logger.log(`✅ Content pages (${SEED_PAGES.length}) and FAQs ensured.`);
  }

  private async seedAdmin() {
    const email = (this.configService.get<string>('ADMIN_EMAIL') || 'admin@lustre.com').toLowerCase();
    const password = this.configService.get<string>('ADMIN_PASSWORD') || 'Admin@123';

    const result = await this.userModel.updateOne(
      { email },
      {
        $setOnInsert: {
          name: 'Store Administrator',
          email,
          password: await bcrypt.hash(password, 10),
          role: 'admin',
          isActive: true,
        },
      },
      { upsert: true },
    );

    this.logger.log(
      result.upsertedCount
        ? `✅ Admin account created: ${email} (change the password after first sign-in).`
        : `✅ Admin account ${email} already exists (password unchanged).`,
    );
  }
}
