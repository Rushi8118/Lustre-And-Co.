// server/src/modules/recommendations/recommendations.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import type {
  RecommendationProduct,
  RecommendationSection,
  RecommendationType,
} from './schemas/recommendation.schema.js';
import type { TrackViewDto } from './dto/track-view.dto.js';
import type { TrackEventDto } from './dto/track-event.dto.js';

const SECTION_LABELS: Record<RecommendationType, string> = {
  you_may_also_like: 'You May Also Like',
  frequently_bought_together: 'Frequently Bought Together',
  recently_viewed: 'Recently Viewed',
  similar_products: 'Similar Products',
  customers_also_purchased: 'Customers Also Purchased',
  complete_the_look: 'Complete the Look',
};

const DEFAULT_LIMIT = 8;

// ── Scoring weights ──────────────────────────────────────────
const WEIGHTS = {
  SAME_CATEGORY: 30,
  SAME_COLLECTION: 20,
  SHARED_TAG: 8,       // per shared tag, capped at 32
  PRICE_RANGE_15: 15,  // within ±15 %
  PRICE_RANGE_30: 8,   // within ±30 %
  CO_PURCHASE: 5,      // per co-purchase occurrence (capped)
  CURATED: 100,        // manual overrides always win
};

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // Public helpers
  // ──────────────────────────────────────────────────────────

  /** Normalise a raw product row into the lean RecommendationProduct shape. */
  private mapProduct(row: any, score = 0, breakdown?: Record<string, number>): RecommendationProduct {
    const images: string[] = Array.isArray(row.images)
      ? row.images
      : row.image
      ? [row.image]
      : [];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price || 0),
      oldPrice: row.old_price != null ? Number(row.old_price) : null,
      image: images[0] ?? null,
      images,
      category: row.category_name ?? row.category ?? null,
      categorySlug: row.category_slug ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      inStock: Boolean(row.in_stock ?? row.stock_quantity > 0),
      score,
      scoreBreakdown: breakdown,
    };
  }

  /** Fetch a list of base product data (active, in-stock optional) for scoring. */
  private async fetchProductPool(excludeIds: string[] = []): Promise<any[]> {
    let q = this.db.client
      .from('products')
      .select(
        'id, name, slug, price, old_price, images, image, tags, in_stock, stock_quantity, category_id, category_name:categories(name, slug)',
      )
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    if (excludeIds.length > 0) {
      q = q.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await q.limit(300);
    if (error) throw error;
    return (data ?? []).map((p: any) => ({
      ...p,
      category_name: p.category_name?.name ?? null,
      category_slug: p.category_name?.slug ?? null,
      category_id: p.category_id,
    }));
  }

  /** Score a candidate product against a source product. */
  private scoreCandidate(
    candidate: any,
    source: any,
    coPurchaseCounts: Map<string, number> = new Map(),
  ): { score: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let score = 0;

    // Category match
    if (
      source.category_id &&
      candidate.category_id === source.category_id
    ) {
      score += WEIGHTS.SAME_CATEGORY;
      breakdown.category = WEIGHTS.SAME_CATEGORY;
    }

    // Tag overlap
    const srcTags = new Set<string>(source.tags ?? []);
    const sharedTags = (candidate.tags ?? []).filter((t: string) => srcTags.has(t));
    if (sharedTags.length > 0) {
      const tagScore = Math.min(sharedTags.length * WEIGHTS.SHARED_TAG, 32);
      score += tagScore;
      breakdown.tags = tagScore;
    }

    // Price range proximity
    if (source.price && candidate.price) {
      const ratio = Math.abs(candidate.price - source.price) / source.price;
      if (ratio <= 0.15) {
        score += WEIGHTS.PRICE_RANGE_15;
        breakdown.price = WEIGHTS.PRICE_RANGE_15;
      } else if (ratio <= 0.30) {
        score += WEIGHTS.PRICE_RANGE_30;
        breakdown.price = WEIGHTS.PRICE_RANGE_30;
      }
    }

    // Co-purchase signal
    const coCount = coPurchaseCounts.get(candidate.id) ?? 0;
    if (coCount > 0) {
      const coScore = Math.min(coCount * WEIGHTS.CO_PURCHASE, 40);
      score += coScore;
      breakdown.co_purchase = coScore;
    }

    return { score, breakdown };
  }

  // ──────────────────────────────────────────────────────────
  // Tracking
  // ──────────────────────────────────────────────────────────

  async trackView(userId: string | null, dto: TrackViewDto): Promise<void> {
    await this.db.client.from('product_views').insert({
      product_id: dto.productId,
      user_id: userId ?? null,
      session_id: dto.sessionId,
      duration_ms: dto.durationMs ?? null,
      source: dto.source ?? 'direct',
    });
  }

  async trackEvent(userId: string | null, dto: TrackEventDto): Promise<void> {
    await this.db.client.from('recommendation_events').insert({
      user_id: userId ?? null,
      session_id: dto.sessionId,
      source_product_id: dto.sourceProductId ?? null,
      recommended_product_id: dto.recommendedProductId,
      recommendation_type: dto.recommendationType,
      event_type: dto.eventType,
      position: dto.position ?? null,
    });
  }

  // ──────────────────────────────────────────────────────────
  // Recently viewed
  // ──────────────────────────────────────────────────────────

  async getRecentlyViewed(
    userId: string | null,
    sessionId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    const filter = userId
      ? { column: 'user_id', value: userId }
      : { column: 'session_id', value: sessionId };

    const { data: views } = await this.db.client
      .from('product_views')
      .select('product_id, viewed_at')
      .eq(filter.column, filter.value)
      .order('viewed_at', { ascending: false })
      .limit(limit * 3); // fetch more to de-dup

    if (!views || views.length === 0) return [];

    // Unique product IDs preserving order
    const seen = new Set<string>();
    const productIds: string[] = [];
    for (const v of views) {
      if (!seen.has(v.product_id)) {
        seen.add(v.product_id);
        productIds.push(v.product_id);
        if (productIds.length >= limit) break;
      }
    }

    const { data: products } = await this.db.client
      .from('products')
      .select(
        'id, name, slug, price, old_price, images, image, tags, in_stock, stock_quantity, category_name:categories(name, slug)',
      )
      .in('id', productIds)
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    if (!products) return [];

    // Restore viewed order
    const byId = new Map(products.map((p: any) => [p.id, p]));
    return productIds
      .filter((id) => byId.has(id))
      .map((id) => this.mapProduct(byId.get(id)));
  }

  // ──────────────────────────────────────────────────────────
  // Frequently bought together
  // ──────────────────────────────────────────────────────────

  async getFrequentlyBoughtTogether(
    productId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    // Check curated first
    const curated = await this.getCuratedFor(productId, 'frequently_bought_together', limit);
    if (curated.length >= 3) return curated;

    // Fall back to co-purchase data
    const { data: pairs } = await this.db.client
      .from('product_co_purchases')
      .select('product_a_id, product_b_id, order_count')
      .or(`product_a_id.eq.${productId},product_b_id.eq.${productId}`)
      .order('order_count', { ascending: false })
      .limit(limit);

    if (!pairs || pairs.length === 0) return this.getSimilarProducts(productId, limit);

    const partnerIds = pairs.map((p: any) =>
      p.product_a_id === productId ? p.product_b_id : p.product_a_id,
    );
    const countMap = new Map<string, number>(
      pairs.map((p: any) => [
        p.product_a_id === productId ? p.product_b_id : p.product_a_id,
        p.order_count,
      ]),
    );

    const { data: products } = await this.db.client
      .from('products')
      .select(
        'id, name, slug, price, old_price, images, image, tags, in_stock, stock_quantity, category_name:categories(name, slug)',
      )
      .in('id', partnerIds)
      .eq('is_active', true)
      .gt('stock_quantity', 0);

    if (!products) return [];

    return products
      .map((p: any) => {
        const count = countMap.get(p.id) ?? 0;
        const score = Math.min(count * WEIGHTS.CO_PURCHASE, 50);
        return this.mapProduct({ ...p, category_name: p.category_name?.name ?? null, category_slug: p.category_name?.slug ?? null }, score);
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ──────────────────────────────────────────────────────────
  // You may also like (rule-based scoring)
  // ──────────────────────────────────────────────────────────

  async getYouMayAlsoLike(
    productId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    // Check curated first
    const curated = await this.getCuratedFor(productId, 'you_may_also_like', limit);
    if (curated.length >= 3) return curated;

    return this.scoredRecommendations(productId, [productId], limit);
  }

  // ──────────────────────────────────────────────────────────
  // Similar products
  // ──────────────────────────────────────────────────────────

  async getSimilarProducts(
    productId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    const curated = await this.getCuratedFor(productId, 'similar_products', limit);
    if (curated.length >= 3) return curated;
    return this.scoredRecommendations(productId, [productId], limit, true);
  }

  // ──────────────────────────────────────────────────────────
  // Customers also purchased (cross-user purchase data)
  // ──────────────────────────────────────────────────────────

  async getCustomersAlsoPurchased(
    productId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    const curated = await this.getCuratedFor(productId, 'customers_also_purchased', limit);
    if (curated.length >= 3) return curated;
    return this.getFrequentlyBoughtTogether(productId, limit);
  }

  // ──────────────────────────────────────────────────────────
  // Complete the look (same category / complementary tags)
  // ──────────────────────────────────────────────────────────

  async getCompleteTheLook(
    productId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    const curated = await this.getCuratedFor(productId, 'complete_the_look', limit);
    if (curated.length >= 3) return curated;
    return this.scoredRecommendations(productId, [productId], limit);
  }

  // ──────────────────────────────────────────────────────────
  // Recommendations based on purchase history
  // ──────────────────────────────────────────────────────────

  async getPersonalisedForUser(
    userId: string,
    excludeProductIds: string[] = [],
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    // Fetch the user's purchased product IDs
    const { data: orderItems } = await this.db.client
      .from('order_items')
      .select('product_id, orders!inner(user_id, status)')
      .eq('orders.user_id', userId)
      .in('orders.status', ['delivered', 'completed', 'shipped'])
      .order('created_at', { ascending: false })
      .limit(50);

    const purchasedIds = [...new Set((orderItems ?? []).map((oi: any) => oi.product_id))];
    if (purchasedIds.length === 0) return [];

    const allExclude = [...new Set([...purchasedIds, ...excludeProductIds])];

    // Fetch those purchased products to get attributes for scoring
    const { data: purchasedProducts } = await this.db.client
      .from('products')
      .select('id, price, category_id, tags')
      .in('id', purchasedIds);

    if (!purchasedProducts || purchasedProducts.length === 0) return [];

    // Build aggregate attribute profile
    const categoryScores = new Map<string, number>();
    const allTags = new Set<string>();
    let totalPrice = 0;
    for (const p of purchasedProducts) {
      if (p.category_id) categoryScores.set(p.category_id, (categoryScores.get(p.category_id) ?? 0) + 1);
      (p.tags ?? []).forEach((t: string) => allTags.add(t));
      totalPrice += Number(p.price || 0);
    }
    const avgPrice = totalPrice / purchasedProducts.length;
    const topCategoryId = [...categoryScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    // Fetch candidate pool
    const pool = await this.fetchProductPool(allExclude);

    // Score candidates
    const scored = pool.map((candidate) => {
      let score = 0;
      if (topCategoryId && candidate.category_id === topCategoryId) score += WEIGHTS.SAME_CATEGORY;
      const shared = (candidate.tags ?? []).filter((t: string) => allTags.has(t));
      score += Math.min(shared.length * WEIGHTS.SHARED_TAG, 32);
      if (avgPrice > 0) {
        const ratio = Math.abs(candidate.price - avgPrice) / avgPrice;
        if (ratio <= 0.15) score += WEIGHTS.PRICE_RANGE_15;
        else if (ratio <= 0.30) score += WEIGHTS.PRICE_RANGE_30;
      }
      return { candidate, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => this.mapProduct(s.candidate, s.score));
  }

  // ──────────────────────────────────────────────────────────
  // Combined multi-section endpoint
  // ──────────────────────────────────────────────────────────

  async getRecommendationSections(
    productId: string,
    userId: string | null,
    sessionId: string,
    types: RecommendationType[],
    limit = 6,
  ): Promise<RecommendationSection[]> {
    const results = await Promise.allSettled(
      types.map(async (type): Promise<RecommendationSection> => {
        let products: RecommendationProduct[] = [];

        switch (type) {
          case 'you_may_also_like':
            products = await this.getYouMayAlsoLike(productId, limit);
            break;
          case 'frequently_bought_together':
            products = await this.getFrequentlyBoughtTogether(productId, limit);
            break;
          case 'recently_viewed':
            products = await this.getRecentlyViewed(userId, sessionId, limit);
            break;
          case 'similar_products':
            products = await this.getSimilarProducts(productId, limit);
            break;
          case 'customers_also_purchased':
            products = await this.getCustomersAlsoPurchased(productId, limit);
            break;
          case 'complete_the_look':
            products = await this.getCompleteTheLook(productId, limit);
            break;
        }

        return { type, label: SECTION_LABELS[type], products };
      }),
    );

    return results
      .filter(
        (r): r is PromiseFulfilledResult<RecommendationSection> =>
          r.status === 'fulfilled' && r.value.products.length > 0,
      )
      .map((r) => r.value);
  }

  // ──────────────────────────────────────────────────────────
  // Cart-page recommendations (based on cart contents)
  // ──────────────────────────────────────────────────────────

  async getCartRecommendations(
    cartProductIds: string[],
    userId: string | null,
    sessionId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<RecommendationProduct[]> {
    if (cartProductIds.length === 0) {
      if (userId) return this.getPersonalisedForUser(userId, [], limit);
      return [];
    }

    const allExclude = [...cartProductIds];
    const pool = await this.fetchProductPool(allExclude);

    // Fetch source products for scoring
    const { data: sources } = await this.db.client
      .from('products')
      .select('id, price, category_id, tags')
      .in('id', cartProductIds);

    if (!sources || sources.length === 0) return [];

    // Fetch co-purchase signals for all cart items
    const { data: pairs } = await this.db.client
      .from('product_co_purchases')
      .select('product_a_id, product_b_id, order_count')
      .or(
        cartProductIds
          .map((id) => `product_a_id.eq.${id},product_b_id.eq.${id}`)
          .join(','),
      );

    const coPurchaseCounts = new Map<string, number>();
    for (const pair of pairs ?? []) {
      const isA = cartProductIds.includes(pair.product_a_id);
      const partnerId = isA ? pair.product_b_id : pair.product_a_id;
      coPurchaseCounts.set(partnerId, (coPurchaseCounts.get(partnerId) ?? 0) + Number(pair.order_count));
    }

    // Score each candidate against all cart items and sum scores
    const candidateScores = new Map<string, number>();
    for (const source of sources) {
      for (const candidate of pool) {
        const { score } = this.scoreCandidate(candidate, source, coPurchaseCounts);
        candidateScores.set(candidate.id, (candidateScores.get(candidate.id) ?? 0) + score);
      }
    }

    const sorted = pool
      .map((p) => ({ p, score: candidateScores.get(p.id) ?? 0 }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return sorted.map(({ p, score }) => this.mapProduct(p, score));
  }

  // ──────────────────────────────────────────────────────────
  // Internal helpers
  // ──────────────────────────────────────────────────────────

  private async getCuratedFor(
    productId: string,
    type: RecommendationType,
    limit: number,
  ): Promise<RecommendationProduct[]> {
    const { data } = await this.db.client
      .from('curated_recommendations')
      .select(
        `position, target:target_product_id(
          id, name, slug, price, old_price, images, image, tags, in_stock, stock_quantity,
          category_name:categories(name, slug)
        )`,
      )
      .eq('source_product_id', productId)
      .eq('recommendation_type', type)
      .eq('is_active', true)
      .order('position', { ascending: true })
      .limit(limit);

    if (!data) return [];

    return data
      .filter((row: any) => row.target && row.target.stock_quantity > 0)
      .map((row: any) =>
        this.mapProduct(
          {
            ...row.target,
            category_name: row.target.category_name?.name ?? null,
            category_slug: row.target.category_name?.slug ?? null,
          },
          WEIGHTS.CURATED,
        ),
      );
  }

  private async scoredRecommendations(
    productId: string,
    excludeIds: string[],
    limit: number,
    strictCategory = false,
  ): Promise<RecommendationProduct[]> {
    // Fetch source product attributes
    const { data: source } = await this.db.client
      .from('products')
      .select('id, price, category_id, tags')
      .eq('id', productId)
      .single();

    if (!source) return [];

    let pool = await this.fetchProductPool(excludeIds);
    if (strictCategory && source.category_id) {
      pool = pool.filter((p) => p.category_id === source.category_id);
    }

    // Fetch co-purchase signals
    const { data: pairs } = await this.db.client
      .from('product_co_purchases')
      .select('product_a_id, product_b_id, order_count')
      .or(`product_a_id.eq.${productId},product_b_id.eq.${productId}`);

    const coPurchaseCounts = new Map<string, number>();
    for (const pair of pairs ?? []) {
      const partnerId = pair.product_a_id === productId ? pair.product_b_id : pair.product_a_id;
      coPurchaseCounts.set(partnerId, Number(pair.order_count));
    }

    const scored = pool
      .map((candidate) => {
        const { score, breakdown } = this.scoreCandidate(candidate, source, coPurchaseCounts);
        return { candidate, score, breakdown };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ candidate, score, breakdown }) =>
      this.mapProduct(candidate, score, breakdown),
    );
  }
}
