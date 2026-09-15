import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema.js';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { SyncCartDto } from './dto/sync-cart.dto.js';
import { SettingsService } from '../settings/settings.service.js';
import { idOrField } from '../../common/utils/object-id.js';

const toKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  private async getOrCreateCart(userId: string | Types.ObjectId): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ user: userId }).exec();
    if (cart) return cart;
    return this.cartModel.create({ user: userId, items: [] });
  }

  private async formatCart(cart: any) {
    const commerce = await this.settingsService.getCommerce();

    // Products that were deleted or hidden by an admin drop out of the bag.
    const items = (cart.items || []).filter(
      (item: any) => item.product && typeof item.product === 'object' && item.product.isActive !== false,
    );

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + (item.product.price || 0) * (item.quantity || 1),
      0,
    );
    const cartCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const freeShippingUnlocked = subtotal >= commerce.freeShippingThreshold;
    const shipping = subtotal === 0 || freeShippingUnlocked ? 0 : commerce.shippingFee;

    return {
      id: cart._id,
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.product._id,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        product: item.product,
      })),
      cartCount,
      subtotal,
      shipping,
      freeShippingUnlocked,
      remainingForFreeShipping: Math.max(0, commerce.freeShippingThreshold - subtotal),
    };
  }

  async getCart(userId: string | Types.ObjectId) {
    await this.getOrCreateCart(userId);
    const cart = await this.cartModel.findOne({ user: userId }).populate('items.product').exec();
    return this.formatCart(cart);
  }

  async addItem(userId: string | Types.ObjectId, dto: AddCartItemDto) {
    const product = await this.productModel
      .findOne({ ...idOrField(dto.productId, 'slug'), isActive: { $ne: false } })
      .exec();
    if (!product) {
      throw new NotFoundException(`Product '${dto.productId}' not found.`);
    }

    const selectedColor = dto.selectedColor || product.availableColors?.[0] || 'Gold';
    const selectedSize = dto.selectedSize || product.availableSizes?.[0] || 'Standard';
    const compositeId = `${product.slug}-${toKey(selectedColor)}-${toKey(selectedSize)}`;

    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find((item) => item.id === compositeId);
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
      cart.items.push({
        id: compositeId,
        product: product._id as any,
        quantity: quantityToAdd,
        selectedColor,
        selectedSize,
      } as any);
    }

    await cart.save();
    return this.getCart(userId);
  }

  async updateItemQuantity(userId: string | Types.ObjectId, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Item is no longer in your bag.');
    }

    const product = await this.productModel.findById(item.product).exec();
    if (product && quantity > product.stockQuantity) {
      throw new BadRequestException(`Only ${product.stockQuantity} of "${product.name}" left in stock.`);
    }

    item.quantity = quantity;
    await cart.save();
    return this.getCart(userId);
  }

  /** Merges a guest's local bag into the account bag after sign-in; unavailable items are skipped. */
  async syncCart(userId: string | Types.ObjectId, dto: SyncCartDto) {
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

  async removeItem(userId: string | Types.ObjectId, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = cart.items.filter((item) => item.id !== itemId);
    await cart.save();
    return this.getCart(userId);
  }

  async clearCart(userId: string | Types.ObjectId) {
    await this.cartModel.updateOne({ user: userId }, { $set: { items: [] } }, { upsert: true }).exec();
    return this.getCart(userId);
  }
}
