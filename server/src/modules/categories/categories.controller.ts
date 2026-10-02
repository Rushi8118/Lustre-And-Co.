import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';

@ApiTags('Categories')
@Controller()
export class CategoriesController {
  constructor(@Inject(CategoriesService) private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List active storefront categories' })
  findPublic() {
    return this.categoriesService.findPublic();
  }

  @Get('admin/categories')
  @AdminOnly()
  @ApiOperation({ summary: 'List all categories with product counts' })
  findAll() {
    return this.categoriesService.findAllForAdmin();
  }

  @Post('admin/categories')
  @AdminOnly()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put('admin/categories/:id')
  @AdminOnly()
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete('admin/categories/:id')
  @AdminOnly()
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
