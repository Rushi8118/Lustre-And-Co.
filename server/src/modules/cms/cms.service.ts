import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFaqDto, CreatePageDto, UpdateFaqDto, UpdatePageDto } from './dto/cms.dto.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { countOf, isUuid, toDoc, toDocs, unwrap } from '../../common/utils/db.js';

@Injectable()
export class CmsService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  async findPublishedPage(slug: string) {
    const page = unwrap(
      await this.db.from('pages').select('*').eq('slug', slug.toLowerCase()).eq('isPublished', true).maybeSingle(),
    );
    if (!page) throw new NotFoundException(`Page '${slug}' is not published.`);
    return toDoc(page);
  }

  async findAllPages() {
    return toDocs(unwrap(await this.db.from('pages').select('*').order('slug')));
  }

  async createPage(dto: CreatePageDto) {
    const slug = dto.slug.toLowerCase().trim();
    if (await countOf(this.db.from('pages').select('id', { count: 'exact', head: true }).eq('slug', slug))) {
      throw new ConflictException(`Page '${dto.slug}' already exists.`);
    }
    return toDoc(unwrap(await this.db.from('pages').insert({ ...dto, slug }).select().single()));
  }

  async updatePage(slug: string, dto: UpdatePageDto) {
    const page = unwrap(
      await this.db.from('pages').update(dto).eq('slug', slug.toLowerCase()).select().maybeSingle(),
    );
    if (!page) throw new NotFoundException(`Page '${slug}' not found.`);
    return toDoc(page);
  }

  async removePage(slug: string) {
    const page = unwrap(await this.db.from('pages').delete().eq('slug', slug.toLowerCase()).select().maybeSingle());
    if (!page) throw new NotFoundException(`Page '${slug}' not found.`);
    return { success: true, message: `Page '${page.title}' deleted.` };
  }

  async findActiveFaqs() {
    return toDocs(
      unwrap(
        await this.db.from('faqs').select('*').eq('isActive', true).order('group').order('sortOrder').order('createdAt'),
      ),
    );
  }

  async findAllFaqs() {
    return toDocs(unwrap(await this.db.from('faqs').select('*').order('group').order('sortOrder').order('createdAt')));
  }

  async createFaq(dto: CreateFaqDto) {
    return toDoc(unwrap(await this.db.from('faqs').insert(dto).select().single()));
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    if (!isUuid(id)) throw new NotFoundException('FAQ not found.');
    const faq = unwrap(await this.db.from('faqs').update(dto).eq('id', id).select().maybeSingle());
    if (!faq) throw new NotFoundException('FAQ not found.');
    return toDoc(faq);
  }

  async removeFaq(id: string) {
    if (!isUuid(id)) throw new NotFoundException('FAQ not found.');
    const faq = unwrap(await this.db.from('faqs').delete().eq('id', id).select().maybeSingle());
    if (!faq) throw new NotFoundException('FAQ not found.');
    return { success: true, message: 'FAQ deleted.' };
  }
}
