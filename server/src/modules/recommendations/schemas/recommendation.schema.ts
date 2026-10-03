// server/src/modules/recommendations/schemas/recommendation.schema.ts

export type RecommendationType =
  | 'you_may_also_like'
  | 'frequently_bought_together'
  | 'recently_viewed'
  | 'similar_products'
  | 'customers_also_purchased'
  | 'complete_the_look';

export interface RecommendationProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  oldPrice: number | null;
  image: string | null;
  images: string[];
  category: string | null;
  categorySlug: string | null;
  tags: string[];
  inStock: boolean;
  score: number;
  scoreBreakdown?: Record<string, number>;
}

export interface RecommendationSection {
  type: RecommendationType;
  label: string;
  products: RecommendationProduct[];
}

export interface TrackViewDto {
  productId: string;
  sessionId: string;
  durationMs?: number;
  source?: string;
}

export interface TrackEventDto {
  sessionId: string;
  sourceProductId?: string;
  recommendedProductId: string;
  recommendationType: RecommendationType;
  eventType: 'impression' | 'click' | 'add_to_cart';
  position?: number;
}
