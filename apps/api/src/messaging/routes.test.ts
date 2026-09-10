import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type {
  AuthRepository,
  CandidateRegistrationRecord,
  CompanyRegistrationRecord,
  StoredCompanyMembership,
  StoredSession,
  StoredUser,
} from '../auth/repository.js';
import { AuthService } from '../auth/service.js';
import type {
  ConversationRecord,
  CreateConversationResult,
  MessageRecord,
  MessagingActor,
  MessagingRepository,
} from './repository.js';
import { MessagingService } from './service.js';

class MemoryAuthRepository implements AuthRepository {
  private users = new Map<string, StoredUser>();
  private byEmail = new Map<string, StoredUser>();
  private memberships = new Map<string, StoredCompanyMembership>();
  private sessions = new Map<string, StoredSession>();

  async findUserByEmail(email: string) { return this.byEmail.get(email) ?? null; }
  async findUserById(id: string) { return this.users.get(id) ?? null; }
  async createCandidateAccount(input: CandidateRegistrationRecord) {
    const user: StoredUser = { id: randomUUID(), email: input.email, passwordHash: input.passwordHash, kind: 'candidate', status: 'active' };
    this.users.set(user.id, user); this.byEmail.set(user.email, user); return user;
  }
  async createCompanyOwnerAccount(input: CompanyRegistrationRecord) {
    const user: StoredUser = { id: randomUUID(), email: input.email, passwordHash: input.passwordHash, kind: 'company_member', status: 'active' };
    const companyId = randomUUID();
    const membership: StoredCompanyMembership = { id: randomUUID(), companyId, userId: user.id, role: 'company_owner', status: 'active' };
    this.users.set(user.id, user); this.byEmail.set(user.email, user); this.memberships.set(user.id, membership);
    return { user, companyId, memberId: membership.id };
  }
  async findActiveMembershipByUserId(userId: string) { return this.memberships.get(userId) ?? null; }
  async createSession(input: { userId: string; tokenHash: string; csrfHash: string | null; clientType: 'web' | 'mobile'; expiresAt: Date }) {
    const session: StoredSession = { id: randomUUID(), ...input, revokedAt: null };
    this.sessions.set(input.tokenHash, session); return session;
  }
  async findSessionByTokenHash(hash: string) { const s = this.sessions.get(hash); return s && !s.revokedAt ? s : null; }
  async revokeSessionByTokenHash(hash: string) { const s = this.sessions.get(hash); if (s) s.revokedAt = new Date(); }
  async touchSession(_sessionId: string, _at: Date) {}
}

class MemoryMessagingRepository implements MessagingRepository {
  readonly candidateId = randomUUID();
  private candidateUserId: string | null = null;
  private conversations = new Map<string, ConversationRecord>();
  private messages = new Map<string, MessageRecord[]>();

  bindCandidateUser(userId: string) { this.candidateUserId = userId; }

  private canAccess(actor: MessagingActor, conversation: ConversationRecord) {
    if (actor.companyId) return actor.companyId === conversation.companyId;
    return actor.userId === this.candidateUserId && conversation.candidateId === this.candidateId;
  }

  async createCompanyConversation(companyId: string, candidateId: string, initiatedByUserId: string): Promise<CreateConversationResult> {
    if (candidateId !== this.candidateId) return { kind: 'candidate_not_available' };
    const existing = [...this.conversations.values()].find((c) => c.companyId === companyId && c.candidateId === candidateId);
    if (existing) return { kind: 'existing', conversation: existing };
    const now = new Date();
    const conversation: ConversationRecord = { id: randomUUID(), companyId, candidateId, initiatedByUserId, createdAt: now, updatedAt: now };
    this.conversations.set(conversation.id, conversation);
    return { kind: 'created', conversation };
  }

  async listForActor(actor: MessagingActor) {
    return [...this.conversations.values()].filter((conversation) => this.canAccess(actor, conversation));
  }

  async getForActor(actor: MessagingActor, conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    return conversation && this.canAccess(actor, conversation) ? conversation : null;
  }

  async listMessagesForActor(actor: MessagingActor, conversationId: string, limit: number) {
    const conversation = await this.getForActor(actor, conversationId);
    if (!conversation) return null;
    return (this.messages.get(conversationId) ?? []).slice(-limit);
  }

  async addMessageForActor(actor: MessagingActor, conversationId: string, body: string) {
    const conversation = await this.getForActor(actor, conversationId);
    if (!conversation) return null;
    const message: MessageRecord = { id: randomUUID(), conversationId, senderUserId: actor.userId, body, createdAt: new Date() };
    const list = this.messages.get(conversationId) ?? [];
    list.push(message); this.messages.set(conversationId, list);
    conversation.updatedAt = new Date();
    return message;
  }
}

const password = 'correct-horse-battery-staple';

async function registerCompany(app: ReturnType<typeof createApp>, email: string, cr: string) {
  await request(app).post('/api/v1/auth/register/company').send({
    email, password, companyName: `Company ${cr}`, countryCode: 'jo', city: 'Amman', commercialRegistrationNumber: cr,
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password, clientType: 'mobile' });
  return { token: login.body.data.sessionToken as string, userId: login.body.data.principal.userId as string };
}

async function registerCandidate(app: ReturnType<typeof createApp>) {
  await request(app).post('/api/v1/auth/register/candidate').send({
    email: 'message-candidate@example.com', password, displayName: 'Candidate', countryCode: 'jo', city: 'Amman',
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'message-candidate@example.com', password, clientType: 'mobile' });
  return { token: login.body.data.sessionToken as string, userId: login.body.data.principal.userId as string };
}

describe('Messaging API', () => {
  it('enforces company-first initiation while allowing candidate replies after contact exists', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const repository = new MemoryMessagingRepository();
    const app = createApp({ authService: auth, messagingService: new MessagingService(repository), secureCookies: false });
    const candidate = await registerCandidate(app);
    repository.bindCandidateUser(candidate.userId);

    const candidateCreate = await request(app)
      .post('/api/v1/conversations')
      .set('authorization', `Bearer ${candidate.token}`)
      .send({ candidateId: repository.candidateId });
    expect(candidateCreate.status).toBe(403);
    expect(candidateCreate.body.error.code).toBe('CONVERSATION_INITIATION_FORBIDDEN');

    const company = await registerCompany(app, 'message-owner@example.com', 'CR-MSG');
    const created = await request(app)
      .post('/api/v1/conversations')
      .set('authorization', `Bearer ${company.token}`)
      .send({ candidateId: repository.candidateId });
    expect(created.status).toBe(201);
    const conversationId = created.body.data.id as string;

    const candidateList = await request(app).get('/api/v1/conversations').set('authorization', `Bearer ${candidate.token}`);
    expect(candidateList.status).toBe(200);
    expect(candidateList.body.data).toHaveLength(1);

    const reply = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('authorization', `Bearer ${candidate.token}`)
      .send({ body: 'Thank you, I am interested.' });
    expect(reply.status).toBe(201);
    expect(reply.body.data.senderUserId).toBe(candidate.userId);
  });

  it('prevents a different company tenant from reading or messaging another company conversation', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const repository = new MemoryMessagingRepository();
    const app = createApp({ authService: auth, messagingService: new MessagingService(repository), secureCookies: false });
    const ownerA = await registerCompany(app, 'tenant-a@example.com', 'CR-A-MSG');
    const ownerB = await registerCompany(app, 'tenant-b@example.com', 'CR-B-MSG');

    const created = await request(app)
      .post('/api/v1/conversations')
      .set('authorization', `Bearer ${ownerA.token}`)
      .send({ candidateId: repository.candidateId });
    const conversationId = created.body.data.id as string;

    const read = await request(app).get(`/api/v1/conversations/${conversationId}`).set('authorization', `Bearer ${ownerB.token}`);
    expect(read.status).toBe(404);
    expect(read.body.error.code).toBe('CONVERSATION_NOT_FOUND');

    const send = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('authorization', `Bearer ${ownerB.token}`)
      .send({ body: 'Cross tenant attempt' });
    expect(send.status).toBe(404);
    expect(send.body.error.code).toBe('CONVERSATION_NOT_FOUND');
  });
});
