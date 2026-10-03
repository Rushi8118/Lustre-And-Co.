import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';
import { LoyaltyModule } from '../loyalty/loyalty.module.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), LoyaltyModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
