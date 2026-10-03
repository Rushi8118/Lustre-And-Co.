import { PartialType } from '@nestjs/swagger';
import { CreateBundleDto } from './create-bundle.dto.js';

export class UpdateBundleDto extends PartialType(CreateBundleDto) {}
