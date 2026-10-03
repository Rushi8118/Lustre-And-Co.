import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { CartDocument, CartItem } from './schemas/cart.schema.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { SyncCartDto } from './dto/sync-cart.dto.js';
import { SettingsService } from '../settings/settings.service.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { BundlesService } from '../bundles/bundles.service.js';
import { AddBundleToCartDto } from '../bundles/dto/add-bundle-to-cart.dto.js';
import { idOrColumn, isUuid, toDoc, toDocs, unwrap } from '../../common/utils/db.js';

const toKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

@Injectable()
export class CartService {
  constructor(
    @Inject(SupabaseService) private readonly db: SupabaseService,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
    @Inject(BundlesService) private readonly bundlesService: BundlesService,
  ) {}

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    const cart = unwrap(await this.db.from('carts').select('*').eq('user', userId).maybeSingle());
    if (cart) return toDoc(cart);
    const created = unwrap(
      await this.db.from('carts').upsert({ user: userId, items: [] }, { onConflict: 'user' }).select().single(),
    );
    return toDoc(created);
  }

  private async saveItems(cartId: string, items: CartItem[]) {
    unwrap(await this.db.from('carts').update({ items }).eq('id', cartId));
  }

  private async formatCart(cart: CartDocument) {
    const commerce = await this.settingsService.getCommerce();

    const productIds = [...new Set((cart.items || []).map((item) => item.product).filter(isUuid))];
    const products = productIds.length
      ? toDocs(unwrap(await this.db.from('products').select('*').in('id', productIds)))
      : [];
    const productsById = new Map(products.map((p: any) => [p.id, p]));

    // Products that were deleted or hidden by an admin drop out of the bag.
    const items = (cart.items || [])
      .map((item) => ({ ...item, product: productsById.get(item.product) }))
      .filter((item: any) => item.product && item.product.isActive !== false);

    const itemSubtotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.product.price || 0) * (item.quantity || 1),
      0,
    );
    const rawBundles = Array.isArray(cart.bundle_items) ? cart.bundle_items : [];
    const bundleSubtotal = rawBundles.reduce(
      (sum: number, b: any) => sum + Number(b.price?.finalTotal || 0),
      0,
    );
    const subtotal = itemSubtotal + bundleSubtotal;

    const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const bundleCount = rawBundles.reduce((sum: number, b: any) => sum + Number(b.quantity || 1), 0);
    const cartCount = itemCount + bundleCount;

    const freeShippingUnlocked = subtotal >= commerce.freeShippingThreshold;
    const shipping = subtotal === 0 || freeShippingUnlocked ? 0 : commerce.shippingFee;

    return {
      id: cart.id,
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.product.id,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        product: item.product,
      })),
      bundleItems: rawBundles,
      cartCount,
      subtotal,
      shipping,
      freeShippingUnlocked,
      remainingForFreeShipping: Math.max(0, commerce.freeShippingThreshold - subtotal),
    };
  }

  async getCart(userId: string) {
    return this.formatCart(await this.getOrCreateCart(userId));
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = unwrap(
      await this.db
        .from('products')
        .select('*')
        .or(idOrColumn(dto.productId, 'slug'))
        .eq('isActive', true)
        .limit(1)
        .maybeSingle(),
    );
    if (!product) {
      throw new NotFoundException(`Product '${dto.productId}' not found.`);
    }

    const selectedColor = dto.selectedColor || product.availableColors?.[0] || 'Gold';
    const selectedSize = dto.selectedSize || product.availableSizes?.[0] || 'Standard';
    const compositeId = `${product.slug}-${toKey(selectedColor)}-${toKey(selectedSize)}`;

    const cart = await this.getOrCreateCart(userId);
    const items = [...(cart.items || [])];
    const existing = items.find((item) => item.id === compositeId);
    const quantityToAdd = dto.quantity && dto.quantity > 0 ? dto.quantity : 1;
    const nextQuantity = (existing?.quantity || 0) + quantityToAdd;

    if (nextQuantity > product.stockQuantity) {
      throw new BadRequestException(
        product.stockQuantity > 0
          ? `Only ${product.stockQuantity} of "${product.name}" left in stock.`
          : `"${product.name}" is out of stock.`,
      );
    }

    if (existing) {
      existing.quantity = nextQuantity;
    } else {
      items.push({
        id: compositeId,
        product: product.id,
        quantity: quantityToAdd,
        selectedColor,
        selectedSize,
      });
    }

    await this.saveItems(cart.id, items);
    return this.getCart(userId);
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const items = [...(cart.items || [])];
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Item is no longer in your bag.');
    }

    const product = isUuid(item.product)
      ? unwrap(await this.db.from('products').select('name, stockQuantity').eq('id', item.product).maybeSingle())
      : null;
    if (product && quantity > product.stockQuantity) {
      throw new BadRequestException(`Only ${product.stockQuantity} of "${product.name}" left in stock.`);
    }

    item.quantity = quantity;
    await this.saveItems(cart.id, items);
    return this.getCart(userId);
  }

  /** Merges a guest's local bag into the account bag after sign-in; unavailable items are skipped. */
  async syncCart(userId: string, dto: SyncCartDto) {
    const skipped: string[] = [];
    for (const item of dto.items || []) {
      try {
        await this.addItem(userId, item);
      } catch (err: any) {
        skipped.push(err?.message || item.productId);
      }
    }
    return { ...(await this.getCart(userId)), skipped };
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.saveItems(
      cart.id,
      (cart.items || []).filter((item) => item.id !== itemId),
    );
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.saveItems(cart.id, []);
    return this.getCart(userId);
  }

  async setRecoveryEmail(cartId: string, email: string, customerName?: string) {
    const payload: Record<string, unknown> = {
      recoveryEmail: email.trim().toLowerCase(),
      updatedAt: new Date().toISOString(),
    };

    if (customerName) payload.customerName = customerName.trim();

    const { data, error } = await this.db
      .from('carts')
      .update(payload)
      .eq('id', cartId)
      .select('*')
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Cart not found.');

    return data;
  }

  async addBundleToCart(
    cartId: string,
    dto: AddBundleToCartDto,
  ) {
    const validation = await this.bundlesService.validateBundle(
      dto.bundleId,
      Number(dto.quantity || 1),
      dto.selectedItems,
    );

    let cart: any = null;
    if (cartId && isUuid(cartId)) {
      const { data } = await this.db
        .from('carts')
        .select('*')
        .eq('id', cartId)
        .maybeSingle();
      cart = data;
    }

    if (!cart) {
      const { data: newCart, error: createError } = await this.db
        .from('carts')
        .insert({ items: [], bundle_items: [] })
        .select('*')
        .single();

      if (createError || !newCart) {
        throw new BadRequestException(createError?.message || 'Could not initialize shopping bag.');
      }
      cart = newCart;
    }

    const existingBundles = Array.isArray(cart.bundle_items)
      ? [...cart.bundle_items]
      : [];

    const existingIndex = existingBundles.findIndex(
      (item: any) => item.bundleId === dto.bundleId,
    );

    const bundleLine = {
      bundleId: dto.bundleId,
      bundleName: validation.bundle.name,
      quantity: Number(dto.quantity || 1),
      selectedItems: validation.selectedItems,
      price: validation.price,
      addedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      existingBundles[existingIndex] = bundleLine;
    } else {
      existingBundles.push(bundleLine);
    }

    const { data, error } = await this.db
      .from('carts')
      .update({
        bundle_items: existingBundles,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', cart.id)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      cart: data,
      bundle: validation.bundle,
      price: validation.price,
    };
  }

  async removeBundleFromCart(cartId: string, bundleId: string) {
    const { data: cart, error: cartError } = await this.db
      .from('carts')
      .select('*')
      .eq('id', cartId)
      .maybeSingle();

    if (cartError || !cart) {
      throw new NotFoundException('Cart not found.');
    }

    const bundleItems = Array.isArray(cart.bundle_items)
      ? cart.bundle_items
      : [];

    const nextBundleItems = bundleItems.filter(
      (item: any) => item.bundleId !== bundleId,
    );

    const { data, error } = await this.db
      .from('carts')
      .update({
        bundle_items: nextBundleItems,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', cartId)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async validateCartBundles(cartId: string) {
    const { data: cart, error } = await this.db
      .from('carts')
      .select('bundle_items')
      .eq('id', cartId)
      .maybeSingle();

    if (error || !cart) {
      throw new NotFoundException('Cart not found.');
    }

    const bundleItems = Array.isArray(cart.bundle_items)
      ? cart.bundle_items
      : [];

    const validatedBundles = [];

    for (const item of bundleItems) {
      const validation = await this.bundlesService.validateBundle(
        item.bundleId,
        Number(item.quantity || 1),
        item.selectedItems,
      );

      validatedBundles.push(validation);
    }

    return {
      valid: true,
      bundles: validatedBundles,
    };
  }
}

