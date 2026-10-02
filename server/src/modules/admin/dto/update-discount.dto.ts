import { PartialType } from '@nestjs/swagger';
import { AdminCreateDiscountDto } from './create-discount.dto.js';

export class AdminUpdateDiscountDto extends PartialType(AdminCreateDiscountDto) {}
