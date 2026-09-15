import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Category, CategoryDocument } from './schemas/category.schema.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { Product, ProductDocument } from '../products/schemas/product.schema.js';
import { idOrField } from '../../common/utils/object-id.js';

const toSlug = (value: string) =>
  ((slugify as any).default || slugify)(value, { lower: true, strict: true }) as string;

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  findPublic() {
    return this.categoryModel.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).exec();
  }

  async findAllForAdmin() {
    const [categories, counts] = await Promise.all([
      this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).lean().exec(),
      this.productModel.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]).exec(),
    ]);
    const countBySlug = new Map(counts.map((c: any) => [c._id, c.count]));
    return categories.map((c) => ({ ...c, productCount: countBySlug.get(c.slug) || 0 }));
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || toSlug(dto.name);
    if (await this.categoryModel.exists({ slug })) {
      throw new ConflictException(`A category with slug '${slug}' already exists.`);
    }
    return this.categoryModel.create({ ...dto, slug, title: dto.title || dto.name });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel.findOne(idOrField(id, 'slug')).exec();
    if (!category) throw new NotFoundException(`Category '${id}' not found.`);

    const previousSlug = category.slug;
    if (
      dto.slug &&
      dto.slug !== previousSlug &&
      (await this.categoryModel.exists({ slug: dto.slug }))
    ) {
      throw new ConflictException(`A category with slug '${dto.slug}' already exists.`);
    }

    Object.assign(category, dto);
    await category.save();

    // Keep products attached when a category slug is renamed.
    if (dto.slug && dto.slug !== previousSlug) {
      await this.productModel
        .updateMany({ category: previousSlug }, { $set: { category: dto.slug } })
        .exec();
    }
    return category;
  }

  async remove(id: string) {
    const category = await this.categoryModel.findOne(idOrField(id, 'slug')).exec();
    if (!category) throw new NotFoundException(`Category '${id}' not found.`);

    const productCount = await this.productModel.countDocuments({ category: category.slug }).exec();
    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete '${category.name}' while ${productCount} product(s) use it. Reassign those products first, or deactivate the category instead.`,
      );
    }
    await category.deleteOne();
    return { success: true, message: `Category '${category.name}' deleted.` };
  }
}
