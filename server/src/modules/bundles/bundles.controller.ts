import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import { BundlesService } from './bundles.service.js';
import { CreateBundleDto } from './dto/create-bundle.dto.js';
import { UpdateBundleDto } from './dto/update-bundle.dto.js';
import { ValidateBundleDto } from './dto/validate-bundle.dto.js';

@ApiTags('Product Bundles')
@Controller('bundles')
export class BundlesController {
  constructor(
    @Inject(BundlesService) private readonly bundlesService: BundlesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active product bundles' })
  listBundles(
    @Query('type') type?: string,
    @Query('featured') featured?: string,
    @Query('search') search?: string,
  ) {
    return this.bundlesService.listBundles({
      type,
      featured:
        featured === undefined ? undefined : featured === 'true',
      search,
    });
  }

  @AdminOnly()
  @Get('admin/all')
  @ApiOperation({ summary: 'List all bundles for administrators' })
  listAdminBundles(
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.bundlesService.listBundles({
      admin: true,
      type,
      search,
    });
  }

  @AdminOnly()
  @Post('admin')
  @ApiOperation({ summary: 'Create a bundle' })
  createBundle(@Body() dto: CreateBundleDto) {
    return this.bundlesService.createBundle(dto);
  }

  @AdminOnly()
  @Put('admin/:id')
  @ApiOperation({ summary: 'Update a bundle' })
  updateBundle(
    @Param('id') id: string,
    @Body() dto: UpdateBundleDto,
  ) {
    return this.bundlesService.updateBundle(id, dto);
  }

  @AdminOnly()
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete a bundle' })
  deleteBundle(@Param('id') id: string) {
    return this.bundlesService.deleteBundle(id);
  }

  @AdminOnly()
  @Post('admin/:id/validate')
  validateAdminBundle(
    @Param('id') id: string,
    @Body() dto: Omit<ValidateBundleDto, 'bundleId'>,
  ) {
    return this.bundlesService.validateBundle(
      id,
      dto.quantity || 1,
      dto.selectedItems,
    );
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate bundle stock and calculate price' })
  validate(@Body() dto: ValidateBundleDto) {
    return this.bundlesService.validateBundle(
      dto.bundleId,
      dto.quantity || 1,
      dto.selectedItems,
    );
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate bundle price' })
  calculatePrice(@Body() dto: ValidateBundleDto) {
    return this.bundlesService.calculateBundlePrice(
      dto.bundleId,
      dto.quantity || 1,
      dto.selectedItems,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bundle by ID or slug' })
  getBundle(@Param('id') id: string) {
    return this.bundlesService.getBundleById(id);
  }
}
