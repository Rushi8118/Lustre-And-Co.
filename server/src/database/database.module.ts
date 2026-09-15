import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../modules/products/schemas/product.schema.js';
import { Coupon, CouponSchema } from '../modules/discounts/schemas/coupon.schema.js';
import { User, UserSchema } from '../modules/users/schemas/user.schema.js';
import { Category, CategorySchema } from '../modules/categories/schemas/category.schema.js';
import { Review, ReviewSchema } from '../modules/reviews/schemas/review.schema.js';
import { Page, PageSchema } from '../modules/cms/schemas/page.schema.js';
import { Faq, FaqSchema } from '../modules/cms/schemas/faq.schema.js';
import { ReviewsModule } from '../modules/reviews/reviews.module.js';
import { SeederService } from './seeder.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Page.name, schema: PageSchema },
      { name: Faq.name, schema: FaqSchema },
    ]),
    ReviewsModule,
  ],
  providers: [SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
