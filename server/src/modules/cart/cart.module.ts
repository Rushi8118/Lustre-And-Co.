import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CartService } from './cart.service.js';
import { CartController } from './cart.controller.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
