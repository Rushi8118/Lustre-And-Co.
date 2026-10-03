import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BundlesModule } from '../bundles/bundles.module.js';
import { CartService } from './cart.service.js';
import { CartController } from './cart.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    BundlesModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
