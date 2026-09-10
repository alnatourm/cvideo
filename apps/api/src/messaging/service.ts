import { z } from 'zod';
import { MessagingError } from './errors.js';
import type { MessagingActor, MessagingRepository } from './repository.js';

const uuidSchema = z.string().uuid();
const createConversationSchema = z.object({ candidateId: uuidSchema });
const messageInputSchema = z.object({ body: z.string().trim().min(1).max(5000) });

export class MessagingService {
  constructor(private readonly repository: MessagingRepository) {}

  async create(actor: MessagingActor, input: unknown) {
    if (!actor.companyId) {
      throw new MessagingError(
        'CONVERSATION_INITIATION_FORBIDDEN',
        403,
        'Only a company member may initiate a conversation',
      );
    }
    const { candidateId } = createConversationSchema.parse(input);
    const result = await this.repository.createCompanyConversation(
      uuidSchema.parse(actor.companyId),
      candidateId,
      uuidSchema.parse(actor.userId),
    );
    if (result.kind === 'candidate_not_available') {
      throw new MessagingError('CANDIDATE_NOT_AVAILABLE', 404, 'Candidate is not available for discovery');
    }
    return { ...result.conversation, existing: result.kind === 'existing' };
  }

  async list(actor: MessagingActor) {
    return this.repository.listForActor({
      userId: uuidSchema.parse(actor.userId),
      companyId: actor.companyId ? uuidSchema.parse(actor.companyId) : null,
    });
  }

  async get(actor: MessagingActor, conversationId: string) {
    const conversation = await this.repository.getForActor(actor, uuidSchema.parse(conversationId));
    if (!conversation) throw new MessagingError('CONVERSATION_NOT_FOUND', 404, 'Conversation not found');
    return conversation;
  }

  async listMessages(actor: MessagingActor, conversationId: string, limitValue: unknown) {
    const limit = z.coerce.number().int().min(1).max(100).default(50).parse(limitValue ?? 50);
    const records = await this.repository.listMessagesForActor(actor, uuidSchema.parse(conversationId), limit);
    if (!records) throw new MessagingError('CONVERSATION_NOT_FOUND', 404, 'Conversation not found');
    return records;
  }

  async sendMessage(actor: MessagingActor, conversationId: string, input: unknown) {
    const { body } = messageInputSchema.parse(input);
    const record = await this.repository.addMessageForActor(actor, uuidSchema.parse(conversationId), body);
    if (!record) throw new MessagingError('CONVERSATION_NOT_FOUND', 404, 'Conversation not found');
    return record;
  }
}
