import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { ReviewsService } from '../modules/reviews/reviews.service.js';
import { SupabaseService } from './supabase.service.js';
import { countOf, unwrap } from '../common/utils/db.js';
import { SEED_CATEGORIES, SEED_COUPONS, SEED_FAQS, SEED_PAGES } from './seed-data/content.data.js';

/**
 * Idempotent seeding. Everything is insert-only (upsert with ignoreDuplicates), so re-running
 * the seed never overwrites changes made through the admin panel.
 */
@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(ReviewsService) private readonly reviewsService: ReviewsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async seed(productsData: any[]) {
    await this.seedCategories();
    await this.seedProducts(productsData);
    await this.seedEmbeddedReviews(productsData);
    await this.seedCoupons();
    await this.seedContent();
    await this.seedAdmin();
    this.logger.log('✨ Database ready.');
  }

  /** Inserts rows whose `conflictColumn` value is new; returns how many were inserted. */
  private async insertMissing(table: string, rows: Record<string, any>[], conflictColumn: string) {
    let inserted = 0;
    for (const row of rows) {
      const result = unwrap(
        await this.db
          .from(table)
          .upsert(row, { onConflict: conflictColumn, ignoreDuplicates: true })
          .select('id'),
      );
      inserted += result?.length || 0;
    }
    return inserted;
  }

  private async seedCategories() {
    await this.insertMissing('categories', SEED_CATEGORIES, 'slug');
    this.logger.log(`✅ Categories ensured (${SEED_CATEGORIES.length}).`);
  }

  private async seedProducts(productsData: any[]) {
    const payloads = productsData.map((item) => {
      const sku =
        item.details?.find((d: string) => d.startsWith('SKU:'))?.replace('SKU:', '').trim() ||
        `LC-${item.category.slice(0, 3).toUpperCase()}-${item.id.replace(/\D/g, '').padStart(3, '0')}`;

      return {
        slug: item.slug,
        name: item.name,
        sku,
        category: item.category,
        collectionName: item.collection || 'everyday',
        occasion: item.occasion || 'everyday',
        price: item.price,
        oldPrice: item.oldPrice ?? null,
        badge: item.badge ?? null,
        finish: item.finish || '18K Gold Plated',
        material: item.material || 'Gold-plated brass',
        availableColors: item.availableColors || (item.color ? [item.color] : ['Gold']),
        availableSizes: item.availableSizes || ['Standard'],
        availability: 'in-stock',
        stockQuantity: item.stockQuantity ?? 50,
        salesCount: 0,
        image: item.image,
        gallery: item.gallery || [item.image],
        description: item.description ?? null,
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
    });

    const inserted = await this.insertMissing('products', payloads, 'slug');
    this.logger.log(`✅ Products ensured (${inserted} new, ${productsData.length - inserted} existing kept).`);
  }

  /** Imports the catalog's sample reviews for products that have none yet, then recomputes ratings. */
  private async seedEmbeddedReviews(productsData: any[]) {
    const legacyBySlug = new Map(productsData.map((p) => [p.slug, p.customerReviews || []]));
    const products = unwrap(await this.db.from('products').select('id, slug')) || [];
    let imported = 0;

    for (const product of products) {
      const legacy = legacyBySlug.get(product.slug) || [];
      const hasReviews = await countOf(
        this.db.from('reviews').select('id', { count: 'exact', head: true }).eq('product', product.id),
      );

      if (!hasReviews && legacy.length) {
        unwrap(
          await this.db.from('reviews').insert(
            legacy.map((r: any) => ({
              product: product.id,
              author: r.author,
              rating: r.rating,
              title: r.title || 'Review',
              comment: r.comment,
              status: 'approved',
              verifiedPurchase: false,
            })),
          ),
        );
        imported += legacy.length;
      }

      await this.reviewsService.recalculateProductRating(product.id);
    }
    this.logger.log(`✅ Sample reviews imported (${imported}); product ratings recalculated from approved reviews.`);
  }

  private async seedCoupons() {
    await this.insertMissing('coupons', SEED_COUPONS, 'code');
    this.logger.log(`✅ Coupons ensured (${SEED_COUPONS.map((c) => c.code).join(', ')}).`);
  }

  private async seedContent() {
    await this.insertMissing('pages', SEED_PAGES, 'slug');

    // FAQs have no unique column, so insert the ones whose question is not present yet.
    const existingQuestions = new Set(
      (unwrap(await this.db.from('faqs').select('question')) || []).map((f: any) => f.question),
    );
    const missingFaqs = SEED_FAQS.filter((faq) => !existingQuestions.has(faq.question));
    if (missingFaqs.length) {
      unwrap(await this.db.from('faqs').insert(missingFaqs));
    }
    this.logger.log(
      `✅ Content pages (${SEED_PAGES.length}) ensured; FAQs ensured (${missingFaqs.length} new).`,
    );
  }

  private async seedAdmin() {
    const email = (this.configService.get<string>('ADMIN_EMAIL') || 'admin@lustre.com').toLowerCase();
    const password = this.configService.get<string>('ADMIN_PASSWORD') || 'Admin@123';

    const inserted = await this.insertMissing(
      'users',
      [
        {
          name: 'Store Administrator',
          email,
          password: await bcrypt.hash(password, 10),
          role: 'admin',
          isActive: true,
        },
      ],
      'email',
    );

    this.logger.log(
      inserted
        ? `✅ Admin account created: ${email} (change the password after first sign-in).`
        : `✅ Admin account ${email} already exists (password unchanged).`,
    );
  }
}
