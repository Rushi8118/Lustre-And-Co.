import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { isUuid } from '../../common/utils/db.js';
import {
  calculateBundlePrice,
  isBundleCurrentlyActive,
  normalizeSelectedItems,
  validateBundleSelection,
  validateBundleStock,
} from './utils/bundle-pricing.js';
import {
  ProductBundle,
  ProductBundleItem,
  SelectedBundleItem,
} from './schemas/product-bundle.schema.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';

@Injectable()
export class BundlesService {
  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
  ) {}

  private mapBundle(row: any, items: any[] = [], products: any[] = []): ProductBundle {
    const productsById = new Map(
      products.map((product) => [String(product.id), product]),
    );

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      bundleType: row.bundle_type,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value || 0),
      minItems: Number(row.min_items || 1),
      maxItems: row.max_items == null ? null : Number(row.max_items),
      buyQuantity:
        row.buy_quantity == null ? null : Number(row.buy_quantity),
      getQuantity:
        row.get_quantity == null ? null : Number(row.get_quantity),
      isActive: Boolean(row.is_active),
      isFeatured: Boolean(row.is_featured),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      image: row.image,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: items.map((item) => ({
        id: item.id,
        bundleId: item.bundle_id,
        productId: item.product_id,
        quantity: Number(item.quantity || 1),
        groupKey: item.group_key,
        isRequired: Boolean(item.is_required),
        sortOrder: Number(item.sort_order || 0),
        product: productsById.has(String(item.product_id))
          ? this.mapProduct(productsById.get(String(item.product_id)))
          : undefined,
      })),
    };
  }

  private mapProduct(product: any) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price || 0),
      image:
        product.thumbnail ||
        product.image ||
        product.images?.[0] ||
        null,
      stockQuantity: Number(
        product.stockQuantity ?? product.stock_quantity ?? 0,
      ),
      availability:
        product.availability ||
        (Number(product.stockQuantity ?? product.stock_quantity ?? 0) > 0
          ? 'in-stock'
          : 'out-of-stock'),
    };
  }

  private async getProducts(productIds: string[]) {
    const uniqueIds = [...new Set(productIds.filter(Boolean))];

    if (!uniqueIds.length) return [];

    const { data, error } = await this.db
      .from('products')
      .select('*')
      .in('id', uniqueIds);

    if (error) throw new BadRequestException(error.message);

    return data || [];
  }

  private async getItems(bundleId: string) {
    const { data, error } = await this.db
      .from('product_bundle_items')
      .select('*')
      .eq('bundle_id', bundleId)
      .order('sort_order', { ascending: true });

    if (error) throw new BadRequestException(error.message);

    return data || [];
  }

  private async findBundleRow(idOrSlug: string) {
    const trimmed = (idOrSlug || '').trim();
    let query = this.db.from('product_bundles').select('*');

    if (isUuid(trimmed)) {
      query = query.or(`id.eq.${trimmed},slug.eq.${trimmed}`);
    } else {
      query = query.eq('slug', trimmed);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Bundle not found.');

    return data;
  }

  async getBundleById(idOrSlug: string): Promise<ProductBundle> {
    const row = await this.findBundleRow(idOrSlug);
    const items = await this.getItems(row.id);
    const products = await this.getProducts(
      items.map((item) => item.product_id),
    );

    return this.mapBundle(row, items, products);
  }

  async listBundles(
    options: {
      admin?: boolean;
      type?: string;
      featured?: boolean;
      search?: string;
    } = {},
  ): Promise<ProductBundle[]> {
    let query = this.db
      .from('product_bundles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!options.admin) {
      query = query.eq('is_active', true);
    }

    if (options.type) {
      query = query.eq('bundle_type', options.type);
    }

    if (options.featured !== undefined) {
      query = query.eq('is_featured', options.featured);
    }

    if (options.search?.trim()) {
      const search = options.search.trim().replace(/,/g, '');
      query = query.or(
        `name.ilike.%${search}%,slug.ilike.%${search}%`,
      );
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    const rows = data || [];
    const allItems = rows.length
      ? await this.db
          .from('product_bundle_items')
          .select('*')
          .in(
            'bundle_id',
            rows.map((row) => row.id),
          )
          .order('sort_order', { ascending: true })
      : { data: [], error: null };

    if (allItems.error) {
      throw new BadRequestException(allItems.error.message);
    }

    const items = allItems.data || [];
    const products = await this.getProducts(
      items.map((item) => item.product_id),
    );

    return rows.map((row) =>
      this.mapBundle(
        row,
        items.filter((item) => item.bundle_id === row.id),
        products,
      ),
    );
  }

  async createBundle(dto: CreateBundleDto): Promise<ProductBundle> {
    const slug = dto.slug.trim().toLowerCase();

    const existing = await this.db
      .from('product_bundles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existing.data) {
      throw new BadRequestException('A bundle with this slug already exists.');
    }

    this.validateBundleDto(dto);

    const { data: bundle, error } = await this.db
      .from('product_bundles')
      .insert({
        name: dto.name.trim(),
        slug,
        description: dto.description || null,
        bundle_type: dto.bundleType,
        discount_type: dto.discountType,
        discount_value: dto.discountValue,
        min_items: dto.minItems || 1,
        max_items: dto.maxItems || null,
        buy_quantity: dto.buyQuantity || null,
        get_quantity: dto.getQuantity || null,
        is_active: dto.isActive ?? true,
        is_featured: dto.isFeatured ?? false,
        starts_at: dto.startsAt || null,
        ends_at: dto.endsAt || null,
        image: dto.image || null,
        metadata: dto.metadata || {},
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);

    await this.replaceBundleItems(bundle.id, dto.items);

    return this.getBundleById(bundle.id);
  }

  async updateBundle(id: string, dto: UpdateBundleDto): Promise<ProductBundle> {
    const current = await this.findBundleRow(id);

    if (dto.items) {
      this.validateBundleDto({
        ...dto,
        items: dto.items,
        name: dto.name || current.name,
        slug: dto.slug || current.slug,
        bundleType: dto.bundleType || current.bundle_type,
        discountType: dto.discountType || current.discount_type,
        discountValue: dto.discountValue ?? current.discount_value,
      } as CreateBundleDto);
    }

    const payload: Record<string, unknown> = {};

    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.slug !== undefined) payload.slug = dto.slug.trim().toLowerCase();
    if (dto.description !== undefined) {
      payload.description = dto.description;
    }
    if (dto.bundleType !== undefined) payload.bundle_type = dto.bundleType;
    if (dto.discountType !== undefined) {
      payload.discount_type = dto.discountType;
    }
    if (dto.discountValue !== undefined) {
      payload.discount_value = dto.discountValue;
    }
    if (dto.minItems !== undefined) payload.min_items = dto.minItems;
    if (dto.maxItems !== undefined) payload.max_items = dto.maxItems;
    if (dto.buyQuantity !== undefined) {
      payload.buy_quantity = dto.buyQuantity;
    }
    if (dto.getQuantity !== undefined) {
      payload.get_quantity = dto.getQuantity;
    }
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;
    if (dto.isFeatured !== undefined) {
      payload.is_featured = dto.isFeatured;
    }
    if (dto.startsAt !== undefined) payload.starts_at = dto.startsAt;
    if (dto.endsAt !== undefined) payload.ends_at = dto.endsAt;
    if (dto.image !== undefined) payload.image = dto.image;
    if (dto.metadata !== undefined) payload.metadata = dto.metadata;

    if (Object.keys(payload).length) {
      const { error } = await this.db
        .from('product_bundles')
        .update(payload)
        .eq('id', current.id);

      if (error) throw new BadRequestException(error.message);
    }

    if (dto.items) {
      await this.replaceBundleItems(current.id, dto.items);
    }

    return this.getBundleById(current.id);
  }

  async deleteBundle(id: string) {
    const current = await this.findBundleRow(id);

    const { error } = await this.db
      .from('product_bundles')
      .delete()
      .eq('id', current.id);

    if (error) throw new BadRequestException(error.message);

    return {
      success: true,
      message: 'Bundle deleted successfully.',
    };
  }

  private validateBundleDto(dto: CreateBundleDto) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'A bundle must contain at least one product.',
      );
    }

    if (
      dto.maxItems !== undefined &&
      dto.minItems !== undefined &&
      dto.maxItems < dto.minItems
    ) {
      throw new BadRequestException(
        'maxItems cannot be lower than minItems.',
      );
    }

    if (
      dto.startsAt &&
      dto.endsAt &&
      new Date(dto.endsAt) <= new Date(dto.startsAt)
    ) {
      throw new BadRequestException(
        'endsAt must be later than startsAt.',
      );
    }

    if (
      dto.discountType === 'percentage' &&
      (dto.discountValue < 0 || dto.discountValue > 100)
    ) {
      throw new BadRequestException(
        'Percentage discounts must be between 0 and 100.',
      );
    }

    if (dto.bundleType === 'bogo') {
      if (!dto.buyQuantity || !dto.getQuantity) {
        throw new BadRequestException(
          'BOGO bundles require buyQuantity and getQuantity.',
        );
      }

      if (dto.discountType !== 'free_item') {
        throw new BadRequestException(
          'BOGO bundles must use the free_item discount type.',
        );
      }
    }

    const duplicateIds = new Set<string>();
    for (const item of dto.items) {
      if (duplicateIds.has(item.productId)) {
        throw new BadRequestException(
          'A product cannot be added to the same bundle more than once.',
        );
      }

      duplicateIds.add(item.productId);
    }
  }

  private async replaceBundleItems(
    bundleId: string,
    items: Array<{
      productId: string;
      quantity: number;
      groupKey?: string;
      isRequired?: boolean;
      sortOrder?: number;
    }>,
  ) {
    const products = await this.getProducts(items.map((item) => item.productId));

    if (products.length !== items.length) {
      throw new BadRequestException(
        'One or more bundle products do not exist.',
      );
    }

    const { error: deleteError } = await this.db
      .from('product_bundle_items')
      .delete()
      .eq('bundle_id', bundleId);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    const rows = items.map((item, index) => ({
      bundle_id: bundleId,
      product_id: item.productId,
      quantity: item.quantity,
      group_key: item.groupKey || null,
      is_required: item.isRequired ?? true,
      sort_order: item.sortOrder ?? index,
    }));

    const { error: insertError } = await this.db
      .from('product_bundle_items')
      .insert(rows);

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }
  }

  async validateBundle(
    bundleId: string,
    quantity: number,
    selectedItems?: SelectedBundleItem[],
  ) {
    const bundle = await this.getBundleById(bundleId);

    if (!isBundleCurrentlyActive(bundle)) {
      throw new BadRequestException(
        'This bundle is not currently available.',
      );
    }

    const normalized = normalizeSelectedItems(bundle, selectedItems);

    try {
      validateBundleSelection(bundle, normalized);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    const products = await this.getProducts(
      normalized.map((item) => item.productId),
    );

    const productsById = new Map(
      products.map((product) => [
        String(product.id),
        this.mapProduct(product),
      ]),
    );

    try {
      validateBundleStock(
        bundle,
        normalized,
        productsById,
        quantity,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : String(error),
      );
    }

    const price = calculateBundlePrice(
      bundle,
      normalized,
      productsById,
      quantity,
    );

    return {
      valid: true,
      bundle,
      selectedItems: normalized,
      price,
    };
  }

  async calculateBundlePrice(
    bundleId: string,
    quantity: number,
    selectedItems?: SelectedBundleItem[],
  ) {
    const result = await this.validateBundle(
      bundleId,
      quantity,
      selectedItems,
    );

    return result.price;
  }
}
