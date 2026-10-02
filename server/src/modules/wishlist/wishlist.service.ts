import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { idOrColumn, isUuid, toDoc, toDocs, unwrap } from '../../common/utils/db.js';

@Injectable()
export class WishlistService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  private async getWishlistIds(userId: string): Promise<string[]> {
    const user = isUuid(userId)
      ? unwrap(await this.db.from('users').select('wishlist').eq('id', userId).maybeSingle())
      : null;
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return user.wishlist || [];
  }

  async getWishlist(userId: string) {
    const ids = await this.getWishlistIds(userId);
    if (!ids.length) return [];

    const products = toDocs<any>(unwrap(await this.db.from('products').select('*').in('id', ids)));
    const byId = new Map(products.map((p) => [p.id, p]));

    // Deleted or hidden products drop out of the list; saved order is kept.
    return ids.map((id) => byId.get(id)).filter((p) => p && p.isActive !== false);
  }

  async toggleWishlist(userId: string, productIdOrSlug: string) {
    const product = unwrap(
      await this.db.from('products').select('*').or(idOrColumn(productIdOrSlug, 'slug')).limit(1).maybeSingle(),
    );
    if (!product) {
      throw new NotFoundException(`Product '${productIdOrSlug}' not found.`);
    }

    const ids = await this.getWishlistIds(userId);
    const inWishlist = !ids.includes(product.id);
    const next = inWishlist ? [...ids, product.id] : ids.filter((id) => id !== product.id);

    unwrap(await this.db.from('users').update({ wishlist: next }).eq('id', userId));

    return {
      inWishlist,
      message: inWishlist
        ? `${product.name} added to your wishlist.`
        : `${product.name} removed from your wishlist.`,
      product: toDoc(product),
      wishlist: await this.getWishlist(userId),
    };
  }
}
