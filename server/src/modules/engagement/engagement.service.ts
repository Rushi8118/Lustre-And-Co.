import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContactMessage, ContactMessageDocument } from './schemas/contact-message.schema.js';
import { Subscriber, SubscriberDocument } from './schemas/subscriber.schema.js';
import {
  CreateContactMessageDto,
  SubscribeDto,
  UpdateContactMessageDto,
} from './dto/engagement.dto.js';
import { containsMatch } from '../../common/utils/regex.js';

@Injectable()
export class EngagementService {
  constructor(
    @InjectModel(ContactMessage.name)
    private readonly messageModel: Model<ContactMessageDocument>,
    @InjectModel(Subscriber.name) private readonly subscriberModel: Model<SubscriberDocument>,
  ) {}

  async createMessage(dto: CreateContactMessageDto, userId?: Types.ObjectId) {
    await this.messageModel.create({ ...dto, user: userId });
    return {
      success: true,
      message: 'Thank you. Your message has been received — we will reply by email.',
    };
  }

  async findMessages(status?: string, search?: string) {
    const filter: Record<string, any> = {};
    if (status && status !== 'all') filter.status = status;
    if (search?.trim()) {
      const rx = containsMatch(search);
      filter.$or = [{ name: rx }, { email: rx }, { message: rx }, { orderId: rx }];
    }
    const [messages, counts] = await Promise.all([
      this.messageModel.find(filter).sort({ createdAt: -1 }).limit(500).exec(),
      this.messageModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).exec(),
    ]);
    return { messages, counts: Object.fromEntries(counts.map((c: any) => [c._id, c.count])) };
  }

  async updateMessage(id: string, dto: UpdateContactMessageDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Message not found.');
    const message = await this.messageModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!message) throw new NotFoundException('Message not found.');
    return message;
  }

  async removeMessage(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Message not found.');
    const message = await this.messageModel.findByIdAndDelete(id).exec();
    if (!message) throw new NotFoundException('Message not found.');
    return { success: true, message: 'Message deleted.' };
  }

  async subscribe(dto: SubscribeDto) {
    const email = dto.email.toLowerCase().trim();
    await this.subscriberModel.updateOne(
      { email },
      { $set: { isActive: true }, $setOnInsert: { email, source: dto.source || 'footer' } },
      { upsert: true },
    );
    return { success: true, message: 'You are subscribed to our newsletter.' };
  }

  findSubscribers(search?: string) {
    const filter = search?.trim() ? { email: containsMatch(search) } : {};
    return this.subscriberModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async updateSubscriber(id: string, isActive: boolean) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Subscriber not found.');
    const subscriber = await this.subscriberModel
      .findByIdAndUpdate(id, { isActive }, { returnDocument: 'after' })
      .exec();
    if (!subscriber) throw new NotFoundException('Subscriber not found.');
    return subscriber;
  }

  async removeSubscriber(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Subscriber not found.');
    const subscriber = await this.subscriberModel.findByIdAndDelete(id).exec();
    if (!subscriber) throw new NotFoundException('Subscriber not found.');
    return { success: true, message: 'Subscriber removed.' };
  }
}
