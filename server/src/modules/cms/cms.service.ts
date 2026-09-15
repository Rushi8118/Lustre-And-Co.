import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Page, PageDocument } from './schemas/page.schema.js';
import { Faq, FaqDocument } from './schemas/faq.schema.js';
import { CreateFaqDto, CreatePageDto, UpdateFaqDto, UpdatePageDto } from './dto/cms.dto.js';

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(Page.name) private readonly pageModel: Model<PageDocument>,
    @InjectModel(Faq.name) private readonly faqModel: Model<FaqDocument>,
  ) {}

  async findPublishedPage(slug: string) {
    const page = await this.pageModel
      .findOne({ slug: slug.toLowerCase(), isPublished: true })
      .exec();
    if (!page) throw new NotFoundException(`Page '${slug}' is not published.`);
    return page;
  }

  findAllPages() {
    return this.pageModel.find().sort({ slug: 1 }).exec();
  }

  async createPage(dto: CreatePageDto) {
    if (await this.pageModel.exists({ slug: dto.slug })) {
      throw new ConflictException(`Page '${dto.slug}' already exists.`);
    }
    return this.pageModel.create(dto);
  }

  async updatePage(slug: string, dto: UpdatePageDto) {
    const page = await this.pageModel
      .findOneAndUpdate(
        { slug: slug.toLowerCase() },
        { $set: dto },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!page) throw new NotFoundException(`Page '${slug}' not found.`);
    return page;
  }

  async removePage(slug: string) {
    const page = await this.pageModel.findOneAndDelete({ slug: slug.toLowerCase() }).exec();
    if (!page) throw new NotFoundException(`Page '${slug}' not found.`);
    return { success: true, message: `Page '${page.title}' deleted.` };
  }

  findActiveFaqs() {
    return this.faqModel
      .find({ isActive: true })
      .sort({ group: 1, sortOrder: 1, createdAt: 1 })
      .exec();
  }

  findAllFaqs() {
    return this.faqModel.find().sort({ group: 1, sortOrder: 1, createdAt: 1 }).exec();
  }

  createFaq(dto: CreateFaqDto) {
    return this.faqModel.create(dto);
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('FAQ not found.');
    const faq = await this.faqModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!faq) throw new NotFoundException('FAQ not found.');
    return faq;
  }

  async removeFaq(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('FAQ not found.');
    const faq = await this.faqModel.findByIdAndDelete(id).exec();
    if (!faq) throw new NotFoundException('FAQ not found.');
    return { success: true, message: 'FAQ deleted.' };
  }
}
