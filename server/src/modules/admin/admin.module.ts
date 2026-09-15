import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Product, ProductSchema } from '../products/schemas/product.schema.js';
import { Order, OrderSchema } from '../orders/schemas/order.schema.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { Coupon, CouponSchema } from '../discounts/schemas/coupon.schema.js';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema.js';
import { Category, CategorySchema } from '../categories/schemas/category.schema.js';
import { Cart, CartSchema } from '../cart/schemas/cart.schema.js';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema.js';
import {
  ContactMessage,
  ContactMessageSchema,
} from '../engagement/schemas/contact-message.schema.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Cart.name, schema: CartSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: ContactMessage.name, schema: ContactMessageSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
