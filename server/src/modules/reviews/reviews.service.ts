import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto, FilterReviewsDto } from './dto/review.dto.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { containsAny, countOf, idOrColumn, isUuid, toDoc, toDocs, unwrap } from '../../common/utils/db.js';

/** Public review fields (the reviewer's user id is not exposed). */
const PUBLIC_REVIEW_COLUMNS =
  'id, product, author, rating, title, comment, status, verifiedPurchase, createdAt, updatedAt';

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  private async findProduct(idOrSlug: string) {
    const product = unwrap(
      await this.db.from('products').select('id, rating, reviews').or(idOrColumn(idOrSlug, 'slug')).limit(1).maybeSingle(),
    );
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  /** Recomputes the denormalized rating and review count shown on product cards. */
  async recalculateProductRating(productId: string) {
    const [stats] = (await this.db.rpc<any[]>('review_stats', { p_product: productId })) || [];
    const count = Number(stats?.count || 0);

    unwrap(
      await this.db
        .from('products')
        .update({
          rating: count ? Number(Number(stats.average).toFixed(1)) : 0,
          reviews: count,
        })
        .eq('id', productId),
    );
  }

  async findApprovedForProduct(idOrSlug: string) {
    const product = await this.findProduct(idOrSlug);
    const reviews = toDocs<any>(
      unwrap(
        await this.db
          .from('reviews')
          .select(PUBLIC_REVIEW_COLUMNS)
          .eq('product', product.id)
          .eq('status', 'approved')
          .order('createdAt', { ascending: false }),
      ),
    );

    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.rating === stars).length,
    }));

    return { reviews, distribution, average: Number(product.rating), count: product.reviews };
  }

  async create(idOrSlug: string, user: UserDocument, dto: CreateReviewDto) {
    const product = await this.findProduct(idOrSlug);

    const existing = await countOf(
      this.db.from('reviews').select('id', { count: 'exact', head: true }).eq('product', product.id).eq('user', user.id),
    );
    if (existing) {
      throw new BadRequestException('You have already reviewed this piece.');
    }

    const verifiedPurchase =
      (await countOf(
        this.db
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user', user.id)
          .neq('status', 'Cancelled')
          .contains('items', JSON.stringify([{ productId: product.id }])),
      )) > 0;

    const { autoApproveReviews } = await this.settingsService.getCommerce();

    const review = toDoc<any>(
      unwrap(
        await this.db
          .from('reviews')
          .insert({
            product: product.id,
            user: user.id,
            author: user.name,
            rating: dto.rating,
            title: dto.title.trim(),
            comment: dto.comment.trim(),
            verifiedPurchase,
            status: autoApproveReviews ? 'approved' : 'pending',
          })
          .select()
          .single(),
      ),
    );

    if (review.status === 'approved') {
      await this.recalculateProductRating(product.id);
    }

    return {
      review,
      message:
        review.status === 'approved'
          ? 'Thank you! Your review is now live.'
          : 'Thank you! Your review has been submitted and will appear once approved.',
    };
  }

  async findAllForAdmin(dto: FilterReviewsDto) {
    let query = this.db.from('reviews').select('*');
    if (dto.status && dto.status !== 'all') query = query.eq('status', dto.status);
    if (dto.search?.trim()) query = query.or(containsAny(['author', 'title', 'comment'], dto.search));

    const [reviews, counts] = await Promise.all([
      query.order('createdAt', { ascending: false }).limit(500).then(unwrap),
      this.db.rpc<any[]>('count_by', { p_table: 'reviews', p_column: 'status' }),
    ]);

    const productIds = [...new Set((reviews || []).map((r: any) => r.product))];
    const products = productIds.length
      ? unwrap(await this.db.from('products').select('id, name, slug, image').in('id', productIds))
      : [];
    const productsById = new Map((products || []).map((p: any) => [p.id, toDoc(p)]));

    return {
      reviews: toDocs(reviews).map((r: any) => ({ ...r, product: productsById.get(r.product) || null })),
      counts: Object.fromEntries((counts || []).map((c) => [c.key, Number(c.count)])),
    };
  }

  async moderate(id: string, status: string) {
    if (!isUuid(id)) throw new NotFoundException('Review not found.');
    const review = unwrap(await this.db.from('reviews').update({ status }).eq('id', id).select().maybeSingle());
    if (!review) throw new NotFoundException('Review not found.');
    await this.recalculateProductRating(review.product);
    return toDoc(review);
  }

  async remove(id: string) {
    if (!isUuid(id)) throw new NotFoundException('Review not found.');
    const review = unwrap(await this.db.from('reviews').delete().eq('id', id).select().maybeSingle());
    if (!review) throw new NotFoundException('Review not found.');
    await this.recalculateProductRating(review.product);
    return { success: true, message: 'Review deleted.' };
  }
}
