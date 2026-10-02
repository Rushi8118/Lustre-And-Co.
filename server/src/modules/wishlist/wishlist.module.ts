import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { WishlistService } from './wishlist.service.js';
import { WishlistController } from './wishlist.controller.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
