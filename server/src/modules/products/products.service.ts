import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ProductDocument } from './schemas/product.schema.js';
import { FilterProductsDto } from './dto/filter-products.dto.js';
import { SupabaseService } from '../../database/supabase.service.js';
import {
  containsAny,
  escapeLike,
  idOrColumn,
  quoteFilterValue,
  toDoc,
  toDocs,
  unwrap,
} from '../../common/utils/db.js';

const SORTS: Record<string, { column: string; ascending: boolean }> = {
  'price-asc': { column: 'price', ascending: true },
  'price-desc': { column: 'price', ascending: false },
  rating: { column: 'rating', ascending: false },
  popular: { column: 'salesCount', ascending: false },
};

@Injectable()
export class ProductsService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  async findAll(query: FilterProductsDto) {
    const {
      category,
      collection,
      occasion,
      finish,
      tag,
      featured,
      minPrice,
      maxPrice,
      sort,
      search,
      page = 1,
      limit = 12,
    } = query;

    let filter = this.db.from('products').select('*', { count: 'exact' }).eq('isActive', true);

    if (category) filter = filter.eq('category', category.toLowerCase().trim());
    if (collection) filter = filter.eq('collectionName', collection.toLowerCase().trim());
    if (occasion) filter = filter.eq('occasion', occasion.toLowerCase().trim());
    if (finish) filter = filter.ilike('finish', escapeLike(finish));
    if (tag) filter = filter.contains('tags', [tag.toLowerCase().trim()]);
    if (featured) filter = filter.eq('isFeatured', true);
    if (minPrice !== undefined) filter = filter.gte('price', Number(minPrice));
    if (maxPrice !== undefined) filter = filter.lte('price', Number(maxPrice));

    if (search && search.trim()) {
      const tagMatch = `tags.cs.{${quoteFilterValue(search.trim().toLowerCase())}}`;
      filter = filter.or(`${containsAny(['name', 'description', 'category', 'material'], search)},${tagMatch}`);
    }

    const { column, ascending } = SORTS[sort as string] || { column: 'createdAt', ascending: false };

    const currentPage = Math.max(1, Number(page));
    const currentLimit = Math.min(200, Math.max(1, Number(limit)));
    const skip = (currentPage - 1) * currentLimit;

    const result = await filter.order(column, { ascending }).range(skip, skip + currentLimit - 1);
    const items = unwrap(result);
    const total = result.count || 0;

    return {
      items: toDocs(items),
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit) || 1,
    };
  }

  async findBySlug(slug: string): Promise<ProductDocument> {
    const product = unwrap(
      await this.db.from('products').select('*').eq('slug', slug.trim()).eq('isActive', true).maybeSingle(),
    );
    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' not found.`);
    }
    return toDoc(product);
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = unwrap(
      await this.db.from('products').select('*').or(idOrColumn(id, 'slug')).eq('isActive', true).limit(1).maybeSingle(),
    );
    if (!product) {
      throw new NotFoundException(`Product not found.`);
    }
    return toDoc(product);
  }

  async findRelated(idOrSlug: string): Promise<ProductDocument[]> {
    const current = await this.findById(idOrSlug);

    const related = toDocs<any>(
      unwrap(
        await this.db
          .from('products')
          .select('*')
          .neq('id', current.id)
          .eq('category', current.category)
          .eq('isActive', true)
          .order('salesCount', { ascending: false })
          .limit(4),
      ),
    ) as ProductDocument[];

    if (related.length < 4) {
      const excluded = [current.id, ...related.map((r) => r.id)];
      const topUps = toDocs<any>(
        unwrap(
          await this.db
            .from('products')
            .select('*')
            .not('id', 'in', `(${excluded.join(',')})`)
            .eq('isActive', true)
            .order('salesCount', { ascending: false })
            .limit(4 - related.length),
        ),
      ) as ProductDocument[];
      return [...related, ...topUps];
    }

    return related;
  }
}
