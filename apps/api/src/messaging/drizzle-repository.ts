import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { candidateProfiles, candidateVideos } from '../db/schema.js';
import { candidateDiscoverySettings } from '../discovery/schema.js';
import { conversations, messages } from './schema.js';
import type {
  ConversationRecord,
  CreateConversationResult,
  MessageRecord,
  MessagingActor,
  MessagingRepository,
} from './repository.js';

function mapConversation(row: typeof conversations.$inferSelect): ConversationRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    candidateId: row.candidateId,
    initiatedByUserId: row.initiatedByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMessage(row: typeof messages.$inferSelect): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderUserId: row.senderUserId,
    body: row.body,
    createdAt: row.createdAt,
  };
}

export class DrizzleMessagingRepository implements MessagingRepository {
  constructor(private readonly db: Database) {}

  private async accessibleConversation(actor: MessagingActor, conversationId: string) {
    const query = this.db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(candidateProfiles, eq(candidateProfiles.id, conversations.candidateId));

    const [row] = actor.companyId
      ? await query
          .where(and(eq(conversations.id, conversationId), eq(conversations.companyId, actor.companyId)))
          .limit(1)
      : await query
          .where(and(eq(conversations.id, conversationId), eq(candidateProfiles.userId, actor.userId)))
          .limit(1);

    return row?.conversation ?? null;
  }

  async createCompanyConversation(
    companyId: string,
    candidateId: string,
    initiatedByUserId: string,
  ): Promise<CreateConversationResult> {
    const [candidate] = await this.db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .innerJoin(candidateDiscoverySettings, eq(candidateDiscoverySettings.candidateId, candidateProfiles.id))
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(
        and(
          eq(candidateProfiles.id, candidateId),
          eq(candidateDiscoverySettings.discoverable, true),
          eq(candidateVideos.status, 'ready'),
        ),
      )
      .limit(1);
    if (!candidate) return { kind: 'candidate_not_available' };

    const [inserted] = await this.db
      .insert(conversations)
      .values({ companyId, candidateId, initiatedByUserId })
      .onConflictDoNothing({ target: [conversations.companyId, conversations.candidateId] })
      .returning();

    if (inserted) return { kind: 'created', conversation: mapConversation(inserted) };

    const [existing] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.companyId, companyId), eq(conversations.candidateId, candidateId)))
      .limit(1);
    if (!existing) throw new Error('Conversation conflict without existing row');
    return { kind: 'existing', conversation: mapConversation(existing) };
  }

  async listForActor(actor: MessagingActor): Promise<ConversationRecord[]> {
    const query = this.db
      .select({ conversation: conversations })
      .from(conversations)
      .innerJoin(candidateProfiles, eq(candidateProfiles.id, conversations.candidateId));

    const rows = actor.companyId
      ? await query.where(eq(conversations.companyId, actor.companyId)).orderBy(desc(conversations.updatedAt))
      : await query.where(eq(candidateProfiles.userId, actor.userId)).orderBy(desc(conversations.updatedAt));

    return rows.map((row) => mapConversation(row.conversation));
  }

  async getForActor(actor: MessagingActor, conversationId: string): Promise<ConversationRecord | null> {
    const conversation = await this.accessibleConversation(actor, conversationId);
    return conversation ? mapConversation(conversation) : null;
  }

  async listMessagesForActor(
    actor: MessagingActor,
    conversationId: string,
    limit: number,
  ): Promise<MessageRecord[] | null> {
    if (!(await this.accessibleConversation(actor, conversationId))) return null;
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit);
    return rows.map(mapMessage).reverse();
  }

  async addMessageForActor(
    actor: MessagingActor,
    conversationId: string,
    body: string,
  ): Promise<MessageRecord | null> {
    if (!(await this.accessibleConversation(actor, conversationId))) return null;

    const [row] = await this.db
      .insert(messages)
      .values({ conversationId, senderUserId: actor.userId, body })
      .returning();
    if (!row) throw new Error('Failed to insert message');

    await this.db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return mapMessage(row);
  }
}
