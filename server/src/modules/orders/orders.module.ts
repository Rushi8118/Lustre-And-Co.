import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { Order, OrderSchema } from './schemas/order.schema.js';
import { Product, ProductSchema } from '../products/schemas/product.schema.js';
import { Cart, CartSchema } from '../cart/schemas/cart.schema.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { DiscountsModule } from '../discounts/discounts.module.js';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    DiscountsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, MongooseModule],
})
export class OrdersModule {}
