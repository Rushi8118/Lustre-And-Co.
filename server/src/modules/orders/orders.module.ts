import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { DiscountsModule } from '../discounts/discounts.module.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), DiscountsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
