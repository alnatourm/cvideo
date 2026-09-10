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
import type { MeetingProvider, MeetingProvisionInput } from './meeting-provider.js';
import type {
  CandidateResponseInput,
  CreateInterviewResult,
  InterviewActor,
  InterviewCreateInput,
  InterviewRecord,
  InterviewsRepository,
} from './repository.js';
import { InterviewsService } from './service.js';

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
  async findSessionByTokenHash(hash: string) { const session = this.sessions.get(hash); return session && !session.revokedAt ? session : null; }
  async revokeSessionByTokenHash(hash: string) { const session = this.sessions.get(hash); if (session) session.revokedAt = new Date(); }
  async touchSession(_sessionId: string, _at: Date) {}
}

class MemoryInterviewsRepository implements InterviewsRepository {
  readonly candidateId = randomUUID();
  private candidateUserId: string | null = null;
  private records = new Map<string, InterviewRecord>();

  bindCandidateUser(userId: string) { this.candidateUserId = userId; }
  private accessible(actor: InterviewActor, record: InterviewRecord) {
    if (actor.companyId) return actor.companyId === record.companyId;
    return actor.userId === this.candidateUserId && record.candidateId === this.candidateId;
  }
  async createCompanyInterview(companyId: string, requestedByUserId: string, input: InterviewCreateInput): Promise<CreateInterviewResult> {
    if (input.candidateId !== this.candidateId) return { kind: 'candidate_not_available' };
    const now = new Date();
    const record: InterviewRecord = {
      id: randomUUID(), companyId, candidateId: input.candidateId, requestedByUserId,
      opportunityTitle: input.opportunityTitle, startsAtUtc: input.startsAtUtc, timezone: input.timezone,
      durationMinutes: input.durationMinutes, meetingType: input.meetingType, message: input.message ?? null,
      location: input.location ?? null, status: 'pending', suggestedStartsAtUtc: null, suggestedTimezone: null,
      suggestedMessage: null, meetingProvider: null, meetingExternalId: null, meetingJoinUrl: null,
      createdAt: now, updatedAt: now,
    };
    this.records.set(record.id, record); return { kind: 'created', interview: record };
  }
  async listForActor(actor: InterviewActor) { return [...this.records.values()].filter((record) => this.accessible(actor, record)); }
  async getForActor(actor: InterviewActor, interviewId: string) { const record = this.records.get(interviewId); return record && this.accessible(actor, record) ? record : null; }
  async candidateRespond(userId: string, interviewId: string, input: CandidateResponseInput) {
    const record = this.records.get(interviewId);
    if (!record || userId !== this.candidateUserId || record.candidateId !== this.candidateId) return null;
    if (record.status !== 'pending') return 'invalid_state' as const;
    if (input.type === 'accept') {
      record.status = 'accepted'; record.meetingProvider = input.meeting?.provider ?? null;
      record.meetingExternalId = input.meeting?.externalId ?? null; record.meetingJoinUrl = input.meeting?.joinUrl ?? null;
    } else if (input.type === 'suggest_time') {
      record.status = 'suggested_time'; record.suggestedStartsAtUtc = input.suggestedStartsAtUtc ?? null;
      record.suggestedTimezone = input.suggestedTimezone ?? null; record.suggestedMessage = input.message ?? null;
    } else { record.status = 'declined'; record.suggestedMessage = input.message ?? null; }
    record.updatedAt = new Date(); return record;
  }
  async companyCancel(companyId: string, interviewId: string) {
    const record = this.records.get(interviewId);
    if (!record || record.companyId !== companyId) return null;
    if (!['pending', 'accepted', 'suggested_time'].includes(record.status)) return 'invalid_state' as const;
    record.status = 'cancelled'; record.updatedAt = new Date(); return record;
  }
}

class FakeMeetProvider implements MeetingProvider {
  lastInput: MeetingProvisionInput | null = null;
  async createMeeting(input: MeetingProvisionInput) {
    this.lastInput = input;
    return { provider: 'google_meet', externalId: `meet-${input.requestId}`, joinUrl: 'https://meet.google.com/example-test' };
  }
}

const password = 'correct-horse-battery-staple';
async function registerCompany(app: ReturnType<typeof createApp>, email: string, cr: string) {
  await request(app).post('/api/v1/auth/register/company').send({ email, password, companyName: `Company ${cr}`, countryCode: 'jo', city: 'Amman', commercialRegistrationNumber: cr });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password, clientType: 'mobile' });
  return { token: login.body.data.sessionToken as string, userId: login.body.data.principal.userId as string };
}
async function registerCandidate(app: ReturnType<typeof createApp>) {
  const email = 'interview-candidate@example.com';
  await request(app).post('/api/v1/auth/register/candidate').send({ email, password, displayName: 'Candidate', countryCode: 'jo', city: 'Amman' });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password, clientType: 'mobile' });
  return { token: login.body.data.sessionToken as string, userId: login.body.data.principal.userId as string };
}

const requestPayload = (candidateId: string) => ({
  candidateId,
  opportunityTitle: 'Sales Manager',
  startsAtUtc: '2026-10-01T10:00:00.000Z',
  timezone: 'Asia/Amman',
  durationMinutes: 30,
  meetingType: 'google_meet',
  message: 'We would like to meet you.',
});

describe('Interviews API', () => {
  it('keeps interview creation company-side and provisions Google Meet only on candidate acceptance', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const repository = new MemoryInterviewsRepository();
    const meet = new FakeMeetProvider();
    const app = createApp({ authService: auth, interviewsService: new InterviewsService(repository, meet), secureCookies: false });
    const candidate = await registerCandidate(app); repository.bindCandidateUser(candidate.userId);

    const forbidden = await request(app).post('/api/v1/interviews').set('authorization', `Bearer ${candidate.token}`).send(requestPayload(repository.candidateId));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('INTERVIEW_ACTION_FORBIDDEN');

    const company = await registerCompany(app, 'interview-owner@example.com', 'CR-IV');
    const created = await request(app).post('/api/v1/interviews').set('authorization', `Bearer ${company.token}`).send(requestPayload(repository.candidateId));
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');
    expect(meet.lastInput).toBeNull();

    const accepted = await request(app).post(`/api/v1/interviews/${created.body.data.id}/accept`).set('authorization', `Bearer ${candidate.token}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe('accepted');
    expect(accepted.body.data.meetingJoinUrl).toBe('https://meet.google.com/example-test');
    expect(meet.lastInput?.requestId).toBe(created.body.data.id);
  });

  it('supports candidate suggested time and blocks another company tenant from the request', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const repository = new MemoryInterviewsRepository();
    const app = createApp({ authService: auth, interviewsService: new InterviewsService(repository), secureCookies: false });
    const candidate = await registerCandidate(app); repository.bindCandidateUser(candidate.userId);
    const companyA = await registerCompany(app, 'interview-a@example.com', 'CR-IVA');
    const companyB = await registerCompany(app, 'interview-b@example.com', 'CR-IVB');

    const payload = { ...requestPayload(repository.candidateId), meetingType: 'video_call' };
    const created = await request(app).post('/api/v1/interviews').set('authorization', `Bearer ${companyA.token}`).send(payload);
    const id = created.body.data.id as string;

    const suggested = await request(app).post(`/api/v1/interviews/${id}/suggest-time`).set('authorization', `Bearer ${candidate.token}`).send({ startsAtUtc: '2026-10-02T12:00:00.000Z', timezone: 'Asia/Amman', message: 'Could we meet later?' });
    expect(suggested.status).toBe(200);
    expect(suggested.body.data.status).toBe('suggested_time');

    const foreignRead = await request(app).get(`/api/v1/interviews/${id}`).set('authorization', `Bearer ${companyB.token}`);
    expect(foreignRead.status).toBe(404);
    expect(foreignRead.body.error.code).toBe('INTERVIEW_NOT_FOUND');
  });
});
