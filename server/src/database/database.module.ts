import { Module } from '@nestjs/common';
import { ReviewsModule } from '../modules/reviews/reviews.module.js';
import { SeederService } from './seeder.service.js';

@Module({
  imports: [ReviewsModule],
  providers: [SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
