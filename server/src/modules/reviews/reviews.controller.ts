import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto, FilterReviewsDto, ModerateReviewDto } from './dto/review.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AdminOnly } from '../../common/decorators/admin-only.decorator.js';
import type { UserDocument } from '../users/schemas/user.schema.js';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(@Inject(ReviewsService) private readonly reviewsService: ReviewsService) {}

  @Get('products/:id/reviews')
  @ApiOperation({ summary: 'Approved reviews and rating distribution for a product' })
  findForProduct(@Param('id') id: string) {
    return this.reviewsService.findApprovedForProduct(id);
  }

  @Post('products/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a review (held for moderation unless auto-approve is enabled)' })
  create(@Param('id') id: string, @CurrentUser() user: UserDocument, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(id, user, dto);
  }

  @Get('admin/reviews')
  @AdminOnly()
  findAll(@Query() dto: FilterReviewsDto) {
    return this.reviewsService.findAllForAdmin(dto);
  }

  @Patch('admin/reviews/:id')
  @AdminOnly()
  moderate(@Param('id') id: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, dto.status);
  }

  @Delete('admin/reviews/:id')
  @AdminOnly()
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
