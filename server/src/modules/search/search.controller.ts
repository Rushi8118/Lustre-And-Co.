import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SearchService } from './search.service.js';

@ApiTags('Search')
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @ApiOperation({ summary: 'Faceted search with typo tolerance and category/finish filtering' })
  @ApiQuery({ name: 'q', required: false, description: 'Search term with fuzzy matching' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'finish', required: false })
  @ApiQuery({ name: 'material', required: false })
  @ApiQuery({ name: 'occasion', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'inStockOnly', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['price-asc', 'price-desc', 'rating', 'popular', 'newest'] })
  async search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('finish') finish?: string,
    @Query('material') material?: string,
    @Query('occasion') occasion?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStockOnly') inStockOnly?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: any,
    @Req() req?: any,
  ) {
    const sessionId = (req?.headers['x-session-id'] as string) || undefined;

    return this.searchService.searchProducts({
      q,
      category,
      finish,
      material,
      occasion,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStockOnly: inStockOnly === 'true',
      sort,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 24,
      userId: user?.id,
      sessionId,
    });
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: 'Instant search suggestions, category matches, and typo corrections' })
  @ApiQuery({ name: 'q', required: true })
  async getSuggestions(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.getSuggestions(q, limit ? Number(limit) : 6);
  }

  @Get('search/popular')
  @ApiOperation({ summary: 'Get trending and popular search terms' })
  async getPopularSearches(@Query('limit') limit?: string) {
    return this.searchService.getPopularKeywords(limit ? Number(limit) : 6);
  }

  @Post('search/track-click')
  @ApiOperation({ summary: 'Track search result click-through telemetry' })
  async trackClick(
    @Body() body: { query: string; productId: string; sessionId?: string },
  ) {
    return this.searchService.trackSearchClick(body.query, body.productId, body.sessionId);
  }

  @AdminOnly()
  @Get('admin/search/analytics')
  @ApiOperation({ summary: 'Admin search intelligence: popular terms and zero-result queries' })
  async getSearchAnalytics() {
    return this.searchService.getSearchAnalyticsSummary();
  }
}
