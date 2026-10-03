// server/src/modules/recommendations/recommendations.controller.ts
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service.js';
import { TrackViewDto } from './dto/track-view.dto.js';
import { TrackEventDto } from './dto/track-event.dto.js';
import type { RecommendationType } from './schemas/recommendation.schema.js';

function extractUser(req: any): string | null {
  return req?.user?.sub ?? req?.user?.id ?? null;
}

const ALL_TYPES: RecommendationType[] = [
  'you_may_also_like',
  'frequently_bought_together',
  'recently_viewed',
  'similar_products',
  'customers_also_purchased',
  'complete_the_look',
];

@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    @Inject(RecommendationsService)
    private readonly svc: RecommendationsService,
  ) {}

  // ── Product-page sections ──────────────────────────────────

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all recommendation sections for a product page' })
  async getProductSections(
    @Param('productId') productId: string,
    @Query('session') sessionId: string = 'anon',
    @Query('types') typesParam?: string,
    @Query('limit') limitParam?: string,
    @Req() req?: any,
  ) {
    const userId = extractUser(req);
    const types = (typesParam ? typesParam.split(',') : ALL_TYPES) as RecommendationType[];
    const limit = limitParam ? parseInt(limitParam, 10) : 6;
    return this.svc.getRecommendationSections(productId, userId, sessionId, types, limit);
  }

  // ── Individual section endpoints ──────────────────────────

  @Get('product/:productId/you-may-also-like')
  @ApiOperation({ summary: '"You May Also Like" recommendations' })
  getYouMayAlsoLike(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getYouMayAlsoLike(productId, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('product/:productId/frequently-bought-together')
  @ApiOperation({ summary: '"Frequently Bought Together" recommendations' })
  getFrequentlyBoughtTogether(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getFrequentlyBoughtTogether(productId, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('product/:productId/similar')
  @ApiOperation({ summary: '"Similar Products" recommendations' })
  getSimilarProducts(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getSimilarProducts(productId, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('product/:productId/customers-also-purchased')
  @ApiOperation({ summary: '"Customers Also Purchased" recommendations' })
  getCustomersAlsoPurchased(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getCustomersAlsoPurchased(productId, limit ? parseInt(limit, 10) : undefined);
  }

  @Get('product/:productId/complete-the-look')
  @ApiOperation({ summary: '"Complete the Look" recommendations' })
  getCompleteTheLook(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getCompleteTheLook(productId, limit ? parseInt(limit, 10) : undefined);
  }

  // ── Recently viewed ────────────────────────────────────────

  @Get('recently-viewed')
  @ApiOperation({ summary: 'Recently viewed products for the current user / session' })
  getRecentlyViewed(
    @Query('session') sessionId: string = 'anon',
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const userId = extractUser(req);
    return this.svc.getRecentlyViewed(userId, sessionId, limit ? parseInt(limit, 10) : undefined);
  }

  // ── Cart-based recommendations ─────────────────────────────

  @Post('cart')
  @ApiOperation({ summary: 'Recommendations based on current cart product IDs' })
  getCartRecommendations(
    @Body() body: { productIds: string[]; sessionId?: string },
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const userId = extractUser(req);
    return this.svc.getCartRecommendations(
      body.productIds ?? [],
      userId,
      body.sessionId ?? 'anon',
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  // ── Personalised (auth) ────────────────────────────────────

  @Get('for-you')
  @ApiOperation({ summary: 'Personalised recommendations based on purchase history' })
  getForYou(
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const userId = extractUser(req);
    if (!userId) return [];
    return this.svc.getPersonalisedForUser(userId, [], limit ? parseInt(limit, 10) : undefined);
  }

  // ── Tracking ───────────────────────────────────────────────

  @Post('track/view')
  @ApiOperation({ summary: 'Track a product page view' })
  trackView(@Body() dto: TrackViewDto, @Req() req?: any) {
    const userId = extractUser(req);
    this.svc.trackView(userId, dto).catch(() => null); // fire-and-forget
    return { ok: true };
  }

  @Post('track/event')
  @ApiOperation({ summary: 'Track a recommendation impression / click / add-to-cart' })
  trackEvent(@Body() dto: TrackEventDto, @Req() req?: any) {
    const userId = extractUser(req);
    this.svc.trackEvent(userId, dto).catch(() => null); // fire-and-forget
    return { ok: true };
  }
}
