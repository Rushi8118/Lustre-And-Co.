import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateContactMessageDto,
  SubscribeDto,
  UpdateContactMessageDto,
} from './dto/engagement.dto.js';
import { SupabaseService } from '../../database/supabase.service.js';
import { containsAny, escapeLike, isUuid, toDoc, toDocs, unwrap } from '../../common/utils/db.js';

@Injectable()
export class EngagementService {
  constructor(@Inject(SupabaseService) private readonly db: SupabaseService) {}

  async createMessage(dto: CreateContactMessageDto, userId?: string) {
    unwrap(
      await this.db.from('contact_messages').insert({
        ...dto,
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        user: userId ?? null,
      }),
    );
    return {
      success: true,
      message: 'Thank you. Your message has been received — we will reply by email.',
    };
  }

  async findMessages(status?: string, search?: string) {
    let query = this.db.from('contact_messages').select('*');
    if (status && status !== 'all') query = query.eq('status', status);
    if (search?.trim()) query = query.or(containsAny(['name', 'email', 'message', 'orderId'], search));

    const [messages, counts] = await Promise.all([
      query.order('createdAt', { ascending: false }).limit(500).then(unwrap),
      this.db.rpc<any[]>('count_by', { p_table: 'contact_messages', p_column: 'status' }),
    ]);
    return {
      messages: toDocs(messages),
      counts: Object.fromEntries((counts || []).map((c) => [c.key, Number(c.count)])),
    };
  }

  async updateMessage(id: string, dto: UpdateContactMessageDto) {
    if (!isUuid(id)) throw new NotFoundException('Message not found.');
    const message = unwrap(await this.db.from('contact_messages').update(dto).eq('id', id).select().maybeSingle());
    if (!message) throw new NotFoundException('Message not found.');
    return toDoc(message);
  }

  async removeMessage(id: string) {
    if (!isUuid(id)) throw new NotFoundException('Message not found.');
    const message = unwrap(await this.db.from('contact_messages').delete().eq('id', id).select().maybeSingle());
    if (!message) throw new NotFoundException('Message not found.');
    return { success: true, message: 'Message deleted.' };
  }

  async subscribe(dto: SubscribeDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = unwrap(await this.db.from('subscribers').select('id').eq('email', email).maybeSingle());
    if (existing) {
      unwrap(await this.db.from('subscribers').update({ isActive: true }).eq('id', existing.id));
    } else {
      unwrap(
        await this.db
          .from('subscribers')
          .upsert({ email, isActive: true, source: dto.source || 'footer' }, { onConflict: 'email' }),
      );
    }
    return { success: true, message: 'You are subscribed to our newsletter.' };
  }

  async findSubscribers(search?: string) {
    let query = this.db.from('subscribers').select('*');
    if (search?.trim()) query = query.ilike('email', `%${escapeLike(search)}%`);
    return toDocs(unwrap(await query.order('createdAt', { ascending: false })));
  }

  async updateSubscriber(id: string, isActive: boolean) {
    if (!isUuid(id)) throw new NotFoundException('Subscriber not found.');
    const subscriber = unwrap(
      await this.db.from('subscribers').update({ isActive }).eq('id', id).select().maybeSingle(),
    );
    if (!subscriber) throw new NotFoundException('Subscriber not found.');
    return toDoc(subscriber);
  }

  async removeSubscriber(id: string) {
    if (!isUuid(id)) throw new NotFoundException('Subscriber not found.');
    const subscriber = unwrap(await this.db.from('subscribers').delete().eq('id', id).select().maybeSingle());
    if (!subscriber) throw new NotFoundException('Subscriber not found.');
    return { success: true, message: 'Subscriber removed.' };
  }
}
