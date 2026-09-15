import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { countOf, idOrColumn, toDoc, toDocs, unwrap } from '../../common/utils/db.js';

const toSlug = (value: string) =>
  ((slugify as any).default || slugify)(value, { lower: true, strict: true }) as string;

@Injectable()
export class CategoriesService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  async findPublic() {
    return toDocs(
      unwrap(await this.db.from('categories').select('*').eq('isActive', true).order('sortOrder').order('name')),
    );
  }

  async findAllForAdmin() {
    const [categories, counts] = await Promise.all([
      this.db.from('categories').select('*').order('sortOrder').order('name').then(unwrap),
      this.db.rpc<any[]>('count_by', { p_table: 'products', p_column: 'category' }),
    ]);
    const countBySlug = new Map((counts || []).map((c) => [c.key, Number(c.count)]));
    return toDocs(categories).map((c: any) => ({ ...c, productCount: countBySlug.get(c.slug) || 0 }));
  }

  private async slugExists(slug: string) {
    return (await countOf(this.db.from('categories').select('id', { count: 'exact', head: true }).eq('slug', slug))) > 0;
  }

  private async findOne(id: string) {
    const category = unwrap(
      await this.db.from('categories').select('*').or(idOrColumn(id, 'slug')).limit(1).maybeSingle(),
    );
    if (!category) throw new NotFoundException(`Category '${id}' not found.`);
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || toSlug(dto.name);
    if (await this.slugExists(slug)) {
      throw new ConflictException(`A category with slug '${slug}' already exists.`);
    }
    return toDoc(
      unwrap(
        await this.db
          .from('categories')
          .insert({ ...dto, slug, title: dto.title || dto.name })
          .select()
          .single(),
      ),
    );
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    const previousSlug = category.slug;
    if (dto.slug && dto.slug !== previousSlug && (await this.slugExists(dto.slug))) {
      throw new ConflictException(`A category with slug '${dto.slug}' already exists.`);
    }

    const updated = unwrap(await this.db.from('categories').update(dto).eq('id', category.id).select().single());

    // Keep products attached when a category slug is renamed.
    if (dto.slug && dto.slug !== previousSlug) {
      unwrap(await this.db.from('products').update({ category: dto.slug }).eq('category', previousSlug));
    }
    return toDoc(updated);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    const productCount = await countOf(
      this.db.from('products').select('id', { count: 'exact', head: true }).eq('category', category.slug),
    );
    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete '${category.name}' while ${productCount} product(s) use it. Reassign those products first, or deactivate the category instead.`,
      );
    }
    unwrap(await this.db.from('categories').delete().eq('id', category.id));
    return { success: true, message: `Category '${category.name}' deleted.` };
  }
}
