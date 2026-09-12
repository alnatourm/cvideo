import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { AuthService } from '../auth/service.js';
import type {
  CandidateDiscoveryReadiness,
  DiscoveryRepository,
  RecruiterCandidateDetail,
  RecruiterSearchFilters,
} from '../discovery/repository.js';
import { DiscoveryService } from '../discovery/service.js';
import type {
  CandidateResponseInput,
  CreateInterviewResult,
  InterviewActor,
  InterviewCreateInput,
  InterviewRecord,
  InterviewsRepository,
} from '../interviews/repository.js';
import { InterviewsService } from '../interviews/service.js';
import type {
  ConversationRecord,
  CreateConversationResult,
  MessageRecord,
  MessagingActor,
  MessagingRepository,
} from '../messaging/repository.js';
import { MessagingService } from '../messaging/service.js';
import type {
  AddCandidateResult,
  SavedListDetail,
  SavedListInput,
  SavedListSummary,
  SavedListsRepository,
} from '../saved-lists/repository.js';
import { SavedListsService } from '../saved-lists/service.js';

const candidateUserId = randomUUID();
const candidateId = randomUUID();
const companyAId = randomUUID();
const companyAUserId = randomUUID();
const companyBId = randomUUID();
const companyBUserId = randomUUID();

function authServiceStub(): AuthService {
  const principals = {
    'candidate-token': {
      userId: candidateUserId,
      email: 'candidate@example.com',
      kind: 'candidate' as const,
      effectiveRole: 'candidate' as const,
      companyId: null,
      companyMemberId: null,
    },
    'company-a-token': {
      userId: companyAUserId,
      email: 'owner-a@example.com',
      kind: 'company_member' as const,
      effectiveRole: 'company_owner' as const,
      companyId: companyAId,
      companyMemberId: randomUUID(),
    },
    'company-b-token': {
      userId: companyBUserId,
      email: 'owner-b@example.com',
      kind: 'company_member' as const,
      effectiveRole: 'company_owner' as const,
      companyId: companyBId,
      companyMemberId: randomUUID(),
    },
  };

  return {
    async authenticateSession(token: string) {
      const principal = principals[token as keyof typeof principals];
      if (!principal) return null;
      return {
        tokenHash: 'test-hash',
        csrfHash: null,
        principal: { ...principal, sessionId: randomUUID(), clientType: 'mobile' as const },
      };
    },
    verifyCsrf() {},
  } as unknown as AuthService;
}

interface StoredList extends SavedListDetail { companyId: string }

class JourneyRepository implements DiscoveryRepository, SavedListsRepository, MessagingRepository {
  private discoverable = true;
  private lists = new Map<string, StoredList>();
  private conversations = new Map<string, ConversationRecord>();
  private messages = new Map<string, MessageRecord[]>();
  private interviews = new Map<string, InterviewRecord>();

  async getReadinessByUserId(userId: string): Promise<CandidateDiscoveryReadiness | null> {
    return userId === candidateUserId
      ? { candidateId, hasReadyVideo: true, hasCategory: true, hasPreferredRole: true, hasSkill: true }
      : null;
  }

  async getVisibilityByUserId(userId: string) { return userId === candidateUserId ? this.discoverable : null; }
  async setVisibilityByUserId(userId: string, value: boolean) {
    if (userId !== candidateUserId) return null;
    this.discoverable = value;
    return value;
  }

  private candidateCard() {
    return {
      id: candidateId,
      displayName: 'Candidate One',
      headline: 'Sales Manager',
      countryCode: 'JO',
      city: 'Amman',
      yearsExperience: 8,
      primaryCategoryId: null,
      primarySubcategoryId: null,
      introductionVideoId: randomUUID(),
      introductionVideoUrl: 'https://video.example/playlist.m3u8',
      introductionVideoThumbnailUrl: 'https://video.example/thumb.jpg',
    };
  }

  async searchCandidates(_filters: RecruiterSearchFilters) {
    return { items: this.discoverable ? [this.candidateCard()] : [], nextCursor: null };
  }

  async getCandidateDetail(id: string): Promise<RecruiterCandidateDetail | null> {
    if (!this.discoverable || id !== candidateId) return null;
    return {
      ...this.candidateCard(),
      professionalSummary: 'Experienced sales leader.',
      cvOriginalFilename: 'candidate.pdf',
      preferredRoleIds: [],
      skillIds: [],
      languageIds: [],
      certificates: [],
      experience: [],
      education: [],
    };
  }

  async list(companyId: string): Promise<SavedListSummary[]> {
    return [...this.lists.values()]
      .filter((list) => list.companyId === companyId)
      .map(({ companyId: _companyId, candidateIds: _candidateIds, ...summary }) => summary);
  }

  async get(companyId: string, listId: string): Promise<SavedListDetail | null> {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return null;
    const { companyId: _companyId, ...detail } = list;
    return { ...detail, candidateIds: [...detail.candidateIds] };
  }

  async create(companyId: string, _actorUserId: string, input: SavedListInput): Promise<SavedListDetail> {
    const now = new Date();
    const stored: StoredList = {
      id: randomUUID(), companyId, name: input.name, description: input.description ?? null,
      candidateCount: 0, candidateIds: [], createdAt: now, updatedAt: now,
    };
    this.lists.set(stored.id, stored);
    const { companyId: _companyId, ...detail } = stored;
    return detail;
  }

  async update(companyId: string, listId: string, input: SavedListInput) {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return null;
    list.name = input.name;
    list.description = input.description ?? null;
    list.updatedAt = new Date();
    return this.get(companyId, listId);
  }

  async delete(companyId: string, listId: string) {
    const list = this.lists.get(listId);
    return Boolean(list && list.companyId === companyId && this.lists.delete(listId));
  }

  async addCandidate(companyId: string, listId: string, id: string, _actorUserId: string): Promise<AddCandidateResult> {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return 'list_not_found';
    if (!this.discoverable || id !== candidateId) return 'candidate_not_found';
    if (!list.candidateIds.includes(id)) list.candidateIds.push(id);
    list.candidateCount = list.candidateIds.length;
    return 'ok';
  }

  async removeCandidate(companyId: string, listId: string, id: string) {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return null;
    const before = list.candidateIds.length;
    list.candidateIds = list.candidateIds.filter((value) => value !== id);
    list.candidateCount = list.candidateIds.length;
    return before !== list.candidateIds.length;
  }

  private canAccessConversation(actor: MessagingActor, conversation: ConversationRecord) {
    return actor.companyId
      ? actor.companyId === conversation.companyId
      : actor.userId === candidateUserId && conversation.candidateId === candidateId;
  }

  async createCompanyConversation(companyId: string, id: string, initiatedByUserId: string): Promise<CreateConversationResult> {
    if (!this.discoverable || id !== candidateId) return { kind: 'candidate_not_available' };
    const existing = [...this.conversations.values()].find((item) => item.companyId === companyId && item.candidateId === id);
    if (existing) return { kind: 'existing', conversation: existing };
    const now = new Date();
    const conversation = { id: randomUUID(), companyId, candidateId: id, initiatedByUserId, createdAt: now, updatedAt: now };
    this.conversations.set(conversation.id, conversation);
    return { kind: 'created', conversation };
  }

  async listForActor(actor: MessagingActor) {
    return [...this.conversations.values()].filter((item) => this.canAccessConversation(actor, item));
  }

  async getForActor(actor: MessagingActor, id: string) {
    const item = this.conversations.get(id);
    return item && this.canAccessConversation(actor, item) ? item : null;
  }

  async listMessagesForActor(actor: MessagingActor, id: string, limit: number) {
    if (!await this.getForActor(actor, id)) return null;
    return (this.messages.get(id) ?? []).slice(-limit);
  }

  async addMessageForActor(actor: MessagingActor, id: string, body: string) {
    const conversation = await this.getForActor(actor, id);
    if (!conversation) return null;
    const message = { id: randomUUID(), conversationId: id, senderUserId: actor.userId, body, createdAt: new Date() };
    this.messages.set(id, [...(this.messages.get(id) ?? []), message]);
    return message;
  }

  private canAccessInterview(actor: InterviewActor, interview: InterviewRecord) {
    return actor.companyId
      ? actor.companyId === interview.companyId
      : actor.userId === candidateUserId && interview.candidateId === candidateId;
  }

  async createCompanyInterview(companyId: string, requestedByUserId: string, input: InterviewCreateInput): Promise<CreateInterviewResult> {
    if (!this.discoverable || input.candidateId !== candidateId) return { kind: 'candidate_not_available' };
    const now = new Date();
    const interview: InterviewRecord = {
      id: randomUUID(), companyId, candidateId: input.candidateId, requestedByUserId,
      opportunityTitle: input.opportunityTitle, startsAtUtc: input.startsAtUtc, timezone: input.timezone,
      durationMinutes: input.durationMinutes, meetingType: input.meetingType, message: input.message ?? null,
      location: input.location ?? null, status: 'pending', suggestedStartsAtUtc: null, suggestedTimezone: null,
      suggestedMessage: null, meetingProvider: null, meetingExternalId: null, meetingJoinUrl: null,
      createdAt: now, updatedAt: now,
    };
    this.interviews.set(interview.id, interview);
    return { kind: 'created', interview };
  }

  async listForActorInterviews(actor: InterviewActor) {
    return [...this.interviews.values()].filter((item) => this.canAccessInterview(actor, item));
  }

  async getForActorInterview(actor: InterviewActor, id: string) {
    const item = this.interviews.get(id);
    return item && this.canAccessInterview(actor, item) ? item : null;
  }

  async candidateRespond(userId: string, id: string, input: CandidateResponseInput) {
    const interview = this.interviews.get(id);
    if (!interview || userId !== candidateUserId || interview.candidateId !== candidateId) return null;
    if (interview.status !== 'pending') return 'invalid_state' as const;
    interview.status = input.type === 'accept' ? 'accepted' : input.type === 'suggest_time' ? 'suggested_time' : 'declined';
    interview.suggestedStartsAtUtc = input.suggestedStartsAtUtc ?? null;
    interview.suggestedTimezone = input.suggestedTimezone ?? null;
    interview.suggestedMessage = input.message ?? null;
    interview.updatedAt = new Date();
    return interview;
  }

  async companyCancel(companyId: string, id: string) {
    const interview = this.interviews.get(id);
    if (!interview || interview.companyId !== companyId) return null;
    if (!['pending', 'accepted', 'suggested_time'].includes(interview.status)) return 'invalid_state' as const;
    interview.status = 'cancelled';
    return interview;
  }

  interviewsRepository(): InterviewsRepository {
    return {
      createCompanyInterview: this.createCompanyInterview.bind(this),
      listForActor: this.listForActorInterviews.bind(this),
      getForActor: this.getForActorInterview.bind(this),
      candidateRespond: this.candidateRespond.bind(this),
      companyCancel: this.companyCancel.bind(this),
    };
  }
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe('critical recruiter journey regression', () => {
  it('completes Search → Watch → Save → Chat → Interview while preserving company isolation', async () => {
    const repository = new JourneyRepository();
    const app = createApp({
      authService: authServiceStub(),
      discoveryService: new DiscoveryService(repository),
      savedListsService: new SavedListsService(repository),
      messagingService: new MessagingService(repository),
      interviewsService: new InterviewsService(repository.interviewsRepository()),
      secureCookies: false,
    });

    const coldContact = await request(app)
      .post('/api/v1/conversations')
      .set(bearer('candidate-token'))
      .send({ candidateId });
    expect(coldContact.status).toBe(403);
    expect(coldContact.body.error.code).toBe('CONVERSATION_INITIATION_FORBIDDEN');

    const search = await request(app)
      .get('/api/v1/search/candidates?countryCode=jo&pageSize=20')
      .set(bearer('company-a-token'));
    expect(search.status).toBe(200);
    expect(search.body.data.items[0]).toMatchObject({ id: candidateId, countryCode: 'JO' });
    expect(search.body.data.items[0].introductionVideoUrl).toContain('playlist.m3u8');
    expect(search.body.data.items[0].email).toBeUndefined();

    const detail = await request(app)
      .get(`/api/v1/search/candidates/${candidateId}`)
      .set(bearer('company-a-token'));
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: candidateId, cvOriginalFilename: 'candidate.pdf' });

    const createdList = await request(app)
      .post('/api/v1/saved-lists')
      .set(bearer('company-a-token'))
      .send({ name: 'Sales leaders' });
    const listId = createdList.body.data.id as string;
    const saved = await request(app)
      .post(`/api/v1/saved-lists/${listId}/candidates`)
      .set(bearer('company-a-token'))
      .send({ candidateId });
    expect(saved.status).toBe(201);
    expect(saved.body.data.candidateIds).toEqual([candidateId]);

    const foreignList = await request(app)
      .get(`/api/v1/saved-lists/${listId}`)
      .set(bearer('company-b-token'));
    expect(foreignList.status).toBe(404);

    const conversation = await request(app)
      .post('/api/v1/conversations')
      .set(bearer('company-a-token'))
      .send({ candidateId });
    const conversationId = conversation.body.data.id as string;
    expect(conversation.status).toBe(201);

    const reply = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(bearer('candidate-token'))
      .send({ body: 'Thank you. I am available.' });
    expect(reply.status).toBe(201);
    expect(reply.body.data.senderUserId).toBe(candidateUserId);

    const foreignConversation = await request(app)
      .get(`/api/v1/conversations/${conversationId}`)
      .set(bearer('company-b-token'));
    expect(foreignConversation.status).toBe(404);

    const interview = await request(app)
      .post('/api/v1/interviews')
      .set(bearer('company-a-token'))
      .send({
        candidateId,
        opportunityTitle: 'Sales Manager',
        startsAtUtc: '2026-10-01T10:00:00.000Z',
        timezone: 'Asia/Amman',
        durationMinutes: 30,
        meetingType: 'video_call',
        message: 'We would like to meet you.',
      });
    const interviewId = interview.body.data.id as string;
    expect(interview.status).toBe(201);
    expect(interview.body.data.status).toBe('pending');

    const foreignInterview = await request(app)
      .get(`/api/v1/interviews/${interviewId}`)
      .set(bearer('company-b-token'));
    expect(foreignInterview.status).toBe(404);

    const accepted = await request(app)
      .post(`/api/v1/interviews/${interviewId}/accept`)
      .set(bearer('candidate-token'));
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('accepted');
  });
});
