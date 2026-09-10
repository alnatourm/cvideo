export interface MessagingActor {
  userId: string;
  companyId: string | null;
}

export interface ConversationRecord {
  id: string;
  companyId: string;
  candidateId: string;
  initiatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  createdAt: Date;
}

export type CreateConversationResult =
  | { kind: 'created' | 'existing'; conversation: ConversationRecord }
  | { kind: 'candidate_not_available' };

export interface MessagingRepository {
  createCompanyConversation(
    companyId: string,
    candidateId: string,
    initiatedByUserId: string,
  ): Promise<CreateConversationResult>;
  listForActor(actor: MessagingActor): Promise<ConversationRecord[]>;
  getForActor(actor: MessagingActor, conversationId: string): Promise<ConversationRecord | null>;
  listMessagesForActor(
    actor: MessagingActor,
    conversationId: string,
    limit: number,
  ): Promise<MessageRecord[] | null>;
  addMessageForActor(
    actor: MessagingActor,
    conversationId: string,
    body: string,
  ): Promise<MessageRecord | null>;
}
