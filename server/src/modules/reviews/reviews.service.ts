import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema.js';
import { CreateReviewDto, FilterReviewsDto } from './dto/review.dto.js';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { Order, OrderDocument } from '../orders/schemas/order.schema.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { containsMatch } from '../../common/utils/regex.js';
import { idOrField } from '../../common/utils/object-id.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @Inject(SettingsService) private readonly settingsService: SettingsService,
  ) {}

  private async findProduct(idOrSlug: string) {
    const product = await this.productModel.findOne(idOrField(idOrSlug, 'slug')).exec();
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  /** Recomputes the denormalized rating and review count shown on product cards. */
  async recalculateProductRating(productId: Types.ObjectId | string) {
    const [stats] = await this.reviewModel
      .aggregate([
        { $match: { product: new Types.ObjectId(productId.toString()), status: 'approved' } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      .exec();

    await this.productModel
      .updateOne(
        { _id: productId },
        {
          $set: {
            rating: stats ? Number(stats.average.toFixed(1)) : 0,
            reviews: stats?.count || 0,
          },
        },
      )
      .exec();
  }

  async findApprovedForProduct(idOrSlug: string) {
    const product = await this.findProduct(idOrSlug);
    const reviews = await this.reviewModel
      .find({ product: product._id, status: 'approved' })
      .sort({ createdAt: -1 })
      .select('-user')
      .lean()
      .exec();

    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: reviews.filter((r) => r.rating === stars).length,
    }));

    return { reviews, distribution, average: product.rating, count: product.reviews };
  }

  async create(idOrSlug: string, user: UserDocument, dto: CreateReviewDto) {
    const product = await this.findProduct(idOrSlug);

    const existing = await this.reviewModel.exists({ product: product._id, user: user._id });
    if (existing) {
      throw new BadRequestException('You have already reviewed this piece.');
    }

    const verifiedPurchase = Boolean(
      await this.orderModel.exists({
        user: user._id,
        status: { $ne: 'Cancelled' },
        'items.productId': product._id.toString(),
      }),
    );

    const { autoApproveReviews } = await this.settingsService.getCommerce();

    const review = await this.reviewModel.create({
      product: product._id,
      user: user._id,
      author: user.name,
      rating: dto.rating,
      title: dto.title.trim(),
      comment: dto.comment.trim(),
      verifiedPurchase,
      status: autoApproveReviews ? 'approved' : 'pending',
    });

    if (review.status === 'approved') {
      await this.recalculateProductRating(product._id);
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
    const filter: Record<string, any> = {};
    if (dto.status && dto.status !== 'all') filter.status = dto.status;
    if (dto.search?.trim()) {
      const rx = containsMatch(dto.search);
      filter.$or = [{ author: rx }, { title: rx }, { comment: rx }];
    }

    const [reviews, counts] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(500)
        .populate('product', 'name slug image')
        .lean()
        .exec(),
      this.reviewModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
    ]);

    return {
      reviews,
      counts: Object.fromEntries(counts.map((c: any) => [c._id, c.count])),
    };
  }

  async moderate(id: string, status: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Review not found.');
    const review = await this.reviewModel
      .findByIdAndUpdate(id, { status }, { returnDocument: 'after' })
      .exec();
    if (!review) throw new NotFoundException('Review not found.');
    await this.recalculateProductRating(review.product);
    return review;
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Review not found.');
    const review = await this.reviewModel.findByIdAndDelete(id).exec();
    if (!review) throw new NotFoundException('Review not found.');
    await this.recalculateProductRating(review.product);
    return { success: true, message: 'Review deleted.' };
  }
}
