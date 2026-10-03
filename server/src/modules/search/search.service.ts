import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';

export interface SearchFacetCounts {
  categories: Record<string, number>;
  finishes: Record<string, number>;
  materials: Record<string, number>;
  occasions: Record<string, number>;
  priceRanges: {
    under5000: number;
    from5000to15000: number;
    from15000to30000: number;
    above30000: number;
  };
}

export interface SearchResult {
  items: any[];
  total: number;
  query: string;
  correctedQuery?: string;
  didYouMean?: string;
  facets: SearchFacetCounts;
  page: number;
  limit: number;
}

export interface SearchSuggestionItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  category: string;
}

export interface SearchSuggestionsResult {
  products: SearchSuggestionItem[];
  categories: string[];
  trendingKeywords: string[];
  didYouMean?: string;
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

const COMMON_JEWELRY_TERMS = [
  'diamond',
  'solitaire',
  'necklace',
  'ring',
  'earring',
  'bangle',
  'bracelet',
  'gold',
  'rose gold',
  'white gold',
  'platinum',
  'emerald',
  'ruby',
  'sapphire',
  'pearl',
  'pendant',
  'mangalsutra',
  'chain',
  'bridal',
  'party',
  'everyday',
  'vintage',
  'choker',
];

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly db: SupabaseService) {}

  findDidYouMean(query: string): string | undefined {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return undefined;

    let bestMatch: string | undefined = undefined;
    let minDistance = Infinity;

    for (const term of COMMON_JEWELRY_TERMS) {
      if (term === q) return undefined; // exact match
      const dist = levenshteinDistance(q, term);
      const threshold = q.length <= 4 ? 1 : 2;

      if (dist <= threshold && dist < minDistance) {
        minDistance = dist;
        bestMatch = term;
      }
    }

    return bestMatch;
  }

  async searchProducts(params: {
    q?: string;
    category?: string;
    finish?: string;
    material?: string;
    occasion?: string;
    minPrice?: number;
    maxPrice?: number;
    inStockOnly?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
    userId?: string;
    sessionId?: string;
  }): Promise<SearchResult> {
    const rawQuery = (params.q || '').trim();
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 24)));
    const skip = (page - 1) * limit;

    let didYouMean = this.findDidYouMean(rawQuery);
    let effectiveQuery = rawQuery;

    // Load active products
    const { data: allActiveProducts, error } = await this.db
      .from('products')
      .select('*')
      .eq('isActive', true);

    if (error || !allActiveProducts) {
      this.logger.error(`Error querying products for search: ${error?.message}`);
      return {
        items: [],
        total: 0,
        query: rawQuery,
        facets: this.emptyFacets(),
        page,
        limit,
      };
    }

    let items = allActiveProducts;

    // 1. Text filter with typo tolerance
    if (effectiveQuery) {
      const qLower = effectiveQuery.toLowerCase();
      let matched = items.filter((p) => this.matchesProduct(p, qLower));

      // If zero matches, try did-you-mean fallback
      if (matched.length === 0 && didYouMean) {
        const fallbackMatched = items.filter((p) => this.matchesProduct(p, didYouMean!));
        if (fallbackMatched.length > 0) {
          matched = fallbackMatched;
          effectiveQuery = didYouMean;
        }
      }

      items = matched;
    }

    // Compute facets on query-matched items BEFORE secondary attribute filters
    const facets = this.computeFacets(items);

    // 2. Secondary attribute filters
    if (params.category) {
      items = items.filter((p) => String(p.category || '').toLowerCase() === params.category!.toLowerCase());
    }

    if (params.finish) {
      items = items.filter((p) => String(p.finish || '').toLowerCase().includes(params.finish!.toLowerCase()));
    }

    if (params.material) {
      items = items.filter((p) => String(p.material || '').toLowerCase().includes(params.material!.toLowerCase()));
    }

    if (params.occasion) {
      items = items.filter((p) => String(p.occasion || '').toLowerCase() === params.occasion!.toLowerCase());
    }

    if (params.minPrice !== undefined) {
      items = items.filter((p) => Number(p.price) >= Number(params.minPrice));
    }

    if (params.maxPrice !== undefined) {
      items = items.filter((p) => Number(p.price) <= Number(params.maxPrice));
    }

    if (params.inStockOnly) {
      items = items.filter((p) => Number(p.stockQuantity ?? p.stock_quantity ?? 0) > 0);
    }

    // 3. Sorting
    items = this.sortItems(items, params.sort);

    const total = items.length;
    const paginatedItems = items.slice(skip, skip + limit);

    // 4. Log search analytics asynchronously
    if (rawQuery) {
      void this.logSearchTelemetry({
        query: rawQuery,
        resultsCount: total,
        userId: params.userId,
        sessionId: params.sessionId,
      });
    }

    return {
      items: paginatedItems,
      total,
      query: rawQuery,
      correctedQuery: effectiveQuery !== rawQuery ? effectiveQuery : undefined,
      didYouMean: didYouMean !== rawQuery ? didYouMean : undefined,
      facets,
      page,
      limit,
    };
  }

  private matchesProduct(p: any, q: string): boolean {
    const name = String(p.name || '').toLowerCase();
    const desc = String(p.description || '').toLowerCase();
    const cat = String(p.category || '').toLowerCase();
    const mat = String(p.material || '').toLowerCase();
    const fin = String(p.finish || '').toLowerCase();
    const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';

    if (
      name.includes(q) ||
      desc.includes(q) ||
      cat.includes(q) ||
      mat.includes(q) ||
      fin.includes(q) ||
      tags.includes(q)
    ) {
      return true;
    }

    // Word token similarity for multi-word queries
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      const allFound = tokens.every(
        (t) => name.includes(t) || cat.includes(t) || desc.includes(t) || tags.includes(t),
      );
      if (allFound) return true;
    }

    return false;
  }

  private sortItems(items: any[], sort?: string): any[] {
    const list = [...items];
    switch (sort) {
      case 'price-asc':
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price-desc':
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case 'rating':
        return list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      case 'popular':
        return list.sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0));
      default:
        return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }
  }

  private computeFacets(items: any[]): SearchFacetCounts {
    const categories: Record<string, number> = {};
    const finishes: Record<string, number> = {};
    const materials: Record<string, number> = {};
    const occasions: Record<string, number> = {};
    const priceRanges = {
      under5000: 0,
      from5000to15000: 0,
      from15000to30000: 0,
      above30000: 0,
    };

    for (const p of items) {
      if (p.category) {
        categories[p.category] = (categories[p.category] || 0) + 1;
      }
      if (p.finish) {
        finishes[p.finish] = (finishes[p.finish] || 0) + 1;
      }
      if (p.material) {
        materials[p.material] = (materials[p.material] || 0) + 1;
      }
      if (p.occasion) {
        occasions[p.occasion] = (occasions[p.occasion] || 0) + 1;
      }

      const price = Number(p.price || 0);
      if (price < 5000) priceRanges.under5000++;
      else if (price <= 15000) priceRanges.from5000to15000++;
      else if (price <= 30000) priceRanges.from15000to30000++;
      else priceRanges.above30000++;
    }

    return {
      categories,
      finishes,
      materials,
      occasions,
      priceRanges,
    };
  }

  private emptyFacets(): SearchFacetCounts {
    return {
      categories: {},
      finishes: {},
      materials: {},
      occasions: {},
      priceRanges: { under5000: 0, from5000to15000: 0, from15000to30000: 0, above30000: 0 },
    };
  }

  async getSuggestions(query: string, limit = 6): Promise<SearchSuggestionsResult> {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return {
        products: [],
        categories: [],
        trendingKeywords: await this.getPopularKeywords(5),
      };
    }

    const didYouMean = this.findDidYouMean(q);

    const { data: products } = await this.db
      .from('products')
      .select('id,name,slug,price,image,category,material,finish,tags')
      .eq('isActive', true)
      .limit(200);

    const matchedProducts: SearchSuggestionItem[] = [];
    const matchedCategories = new Set<string>();

    for (const p of products || []) {
      if (this.matchesProduct(p, q) || (didYouMean && this.matchesProduct(p, didYouMean))) {
        if (matchedProducts.length < limit) {
          matchedProducts.push({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: Number(p.price),
            image: p.image || (Array.isArray((p as any).gallery) ? (p as any).gallery[0] : ''),
            category: p.category,
          });
        }
        if (p.category) {
          matchedCategories.add(p.category);
        }
      }
    }

    return {
      products: matchedProducts,
      categories: [...matchedCategories].slice(0, 4),
      trendingKeywords: await this.getPopularKeywords(4),
      didYouMean: didYouMean !== q ? didYouMean : undefined,
    };
  }

  async getPopularKeywords(limit = 6): Promise<string[]> {
    try {
      const { data } = await this.db
        .from('search_analytics')
        .select('normalized_query')
        .gt('results_count', 0)
        .order('created_at', { ascending: false })
        .limit(200);

      const freq: Record<string, number> = {};
      for (const row of data || []) {
        const k = row.normalized_query;
        if (k && k.length > 2) {
          freq[k] = (freq[k] || 0) + 1;
        }
      }

      const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
      if (sorted.length >= 3) {
        return sorted.slice(0, limit);
      }
    } catch {
      // fallback
    }

    return [
      'Solitaire Diamond Ring',
      'Gold Chain Necklace',
      'Rose Gold Bangle',
      'Pearl Drop Earrings',
      'Bridal Jewellery Set',
    ].slice(0, limit);
  }

  private async logSearchTelemetry(input: {
    query: string;
    resultsCount: number;
    userId?: string;
    sessionId?: string;
  }) {
    try {
      await this.db.from('search_analytics').insert({
        query: input.query,
        normalized_query: input.query.trim().toLowerCase(),
        results_count: input.resultsCount,
        user_id: input.userId || null,
        session_id: input.sessionId || null,
      });
    } catch {
      // non-fatal
    }
  }

  async trackSearchClick(query: string, productId: string, sessionId?: string) {
    try {
      await this.db.from('search_analytics').insert({
        query,
        normalized_query: query.trim().toLowerCase(),
        results_count: 1,
        clicked_product_id: productId,
        session_id: sessionId || null,
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async getSearchAnalyticsSummary() {
    const { data: logs } = await this.db
      .from('search_analytics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    const queryCounts: Record<string, { count: number; resultsCount: number }> = {};
    const zeroResults: Record<string, number> = {};

    for (const log of logs || []) {
      const q = log.normalized_query;
      if (!q) continue;

      if (!queryCounts[q]) {
        queryCounts[q] = { count: 0, resultsCount: log.results_count };
      }
      queryCounts[q].count++;

      if (log.results_count === 0) {
        zeroResults[q] = (zeroResults[q] || 0) + 1;
      }
    }

    const popular = Object.entries(queryCounts)
      .map(([query, val]) => ({ query, count: val.count, resultsCount: val.resultsCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const missed = Object.entries(zeroResults)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSearchesLogged: (logs || []).length,
      popularQueries: popular,
      zeroResultQueries: missed,
    };
  }
}
