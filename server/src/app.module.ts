import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { DiscountsModule } from './modules/discounts/discounts.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { WishlistModule } from './modules/wishlist/wishlist.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { CmsModule } from './modules/cms/cms.module.js';
import { EngagementModule } from './modules/engagement/engagement.module.js';
import { DatabaseModule } from './database/database.module.js';
import { SupabaseModule } from './database/supabase.module.js';
import { AbandonedCartsModule } from './modules/abandoned-carts/abandoned-carts.module.js';
import { BundlesModule } from './modules/bundles/bundles.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { LoyaltyModule } from './modules/loyalty/loyalty.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { ShippingModule } from './modules/shipping/shipping.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { ReturnsModule } from './modules/returns/returns.module.js';
import { MarketingModule } from './modules/marketing/marketing.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { SearchModule } from './modules/search/search.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    AuditModule,
    NotificationsModule,
    StorageModule,
    SearchModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    ReviewsModule,
    BundlesModule,
    RecommendationsModule,
    LoyaltyModule,
    InventoryModule,
    ShippingModule,
    DocumentsModule,
    ReturnsModule,
    MarketingModule,
    AnalyticsModule,
    CartModule,
    WishlistModule,
    OrdersModule,
    DiscountsModule,
    PaymentsModule,
    CmsModule,
    EngagementModule,
    AbandonedCartsModule,
    AdminModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
