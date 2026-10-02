import { Controller, Get, Query, Param, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service.js';
import { FilterProductsDto } from './dto/filter-products.dto.js';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Get visible products with filters, search, sorting, and pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully with pagination.' })
  async findAll(@Query() query: FilterProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single product by its URL slug' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get up to 4 related pieces from the same category' })
  async findRelated(@Param('id') id: string) {
    return this.productsService.findRelated(id);
  }
}
