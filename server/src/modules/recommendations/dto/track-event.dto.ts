// server/src/modules/recommendations/dto/track-event.dto.ts
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackEventDto {
  @ApiProperty({ description: 'Anonymous session identifier' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Source product that generated the recommendation' })
  @IsOptional()
  @IsUUID()
  sourceProductId?: string;

  @ApiProperty({ description: 'Product that was recommended' })
  @IsUUID()
  recommendedProductId: string;

  @ApiProperty({
    description: 'Recommendation area type',
    enum: [
      'you_may_also_like',
      'frequently_bought_together',
      'recently_viewed',
      'similar_products',
      'customers_also_purchased',
      'complete_the_look',
    ],
  })
  @IsString()
  recommendationType: string;

  @ApiProperty({ enum: ['impression', 'click', 'add_to_cart'] })
  @IsIn(['impression', 'click', 'add_to_cart'])
  eventType: 'impression' | 'click' | 'add_to_cart';

  @ApiPropertyOptional({ description: 'Zero-based position in the recommendation list' })
  @IsOptional()
  @IsNumber()
  position?: number;
}
