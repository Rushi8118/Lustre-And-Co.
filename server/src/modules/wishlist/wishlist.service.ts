import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { idOrField } from '../../common/utils/object-id.js';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async getWishlist(userId: string | Types.ObjectId) {
    const user = await this.userModel.findById(userId).populate('wishlist').exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Deleted or hidden products drop out of the list.
    return ((user.wishlist || []) as any[]).filter((p) => p && p.isActive !== false);
  }

  async toggleWishlist(userId: string | Types.ObjectId, productIdOrSlug: string) {
    const product = await this.productModel.findOne(idOrField(productIdOrSlug, 'slug')).exec();
    if (!product) {
      throw new NotFoundException(`Product '${productIdOrSlug}' not found.`);
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const existingIndex = user.wishlist.findIndex(
      (id) => id.toString() === product._id.toString(),
    );

    const inWishlist = existingIndex === -1;
    if (inWishlist) {
      user.wishlist.push(product._id as any);
    } else {
      user.wishlist.splice(existingIndex, 1);
    }

    await user.save();

    return {
      inWishlist,
      message: inWishlist
        ? `${product.name} added to your wishlist.`
        : `${product.name} removed from your wishlist.`,
      product,
      wishlist: await this.getWishlist(userId),
    };
  }
}
