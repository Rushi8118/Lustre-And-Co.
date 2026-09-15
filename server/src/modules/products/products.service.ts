import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema.js';
import { FilterProductsDto } from './dto/filter-products.dto.js';
import { containsMatch, exactMatch } from '../../common/utils/regex.js';
import { idOrField } from '../../common/utils/object-id.js';

const VISIBLE = { isActive: { $ne: false } };

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async findAll(query: FilterProductsDto) {
    const {
      category,
      collection,
      occasion,
      finish,
      tag,
      featured,
      minPrice,
      maxPrice,
      sort,
      search,
      page = 1,
      limit = 12,
    } = query;

    const filter: Record<string, any> = { ...VISIBLE };

    if (category) filter.category = category.toLowerCase().trim();
    if (collection) filter.collectionName = collection.toLowerCase().trim();
    if (occasion) filter.occasion = occasion.toLowerCase().trim();
    if (finish) filter.finish = exactMatch(finish);
    if (tag) filter.tags = tag.toLowerCase().trim();
    if (featured) filter.isFeatured = true;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
    }

    if (search && search.trim()) {
      const searchRegex = containsMatch(search);
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { category: searchRegex },
        { material: searchRegex },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (sort === 'price-asc') {
      sortOptions.price = 1;
    } else if (sort === 'price-desc') {
      sortOptions.price = -1;
    } else if (sort === 'rating') {
      sortOptions.rating = -1;
    } else if (sort === 'popular') {
      sortOptions.salesCount = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const currentPage = Math.max(1, Number(page));
    const currentLimit = Math.min(200, Math.max(1, Number(limit)));
    const skip = (currentPage - 1) * currentLimit;

    const [items, total] = await Promise.all([
      this.productModel.find(filter).sort(sortOptions).skip(skip).limit(currentLimit).exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page: currentPage,
      limit: currentLimit,
      totalPages: Math.ceil(total / currentLimit) || 1,
    };
  }

  async findBySlug(slug: string): Promise<ProductDocument> {
    const product = await this.productModel.findOne({ slug: slug.trim(), ...VISIBLE }).exec();
    if (!product) {
      throw new NotFoundException(`Product with slug '${slug}' not found.`);
    }
    return product;
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findOne({ ...idOrField(id, 'slug'), ...VISIBLE }).exec();
    if (!product) {
      throw new NotFoundException(`Product not found.`);
    }
    return product;
  }

  async findRelated(idOrSlug: string): Promise<ProductDocument[]> {
    const current = await this.findById(idOrSlug);

    const related = await this.productModel
      .find({ _id: { $ne: current._id }, category: current.category, ...VISIBLE })
      .sort({ salesCount: -1 })
      .limit(4)
      .exec();

    if (related.length < 4) {
      const topUps = await this.productModel
        .find({ _id: { $nin: [current._id, ...related.map((r) => r._id)] }, ...VISIBLE })
        .sort({ salesCount: -1 })
        .limit(4 - related.length)
        .exec();
      return [...related, ...topUps];
    }

    return related;
  }
}
