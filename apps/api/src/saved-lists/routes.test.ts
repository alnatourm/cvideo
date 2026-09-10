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
  AddCandidateResult,
  SavedListDetail,
  SavedListInput,
  SavedListSummary,
  SavedListsRepository,
} from './repository.js';
import { SavedListsService } from './service.js';

class MemoryAuthRepository implements AuthRepository {
  private users = new Map<string, StoredUser>();
  private byEmail = new Map<string, StoredUser>();
  private memberships = new Map<string, StoredCompanyMembership>();
  private sessions = new Map<string, StoredSession>();

  async findUserByEmail(email: string) { return this.byEmail.get(email) ?? null; }
  async findUserById(id: string) { return this.users.get(id) ?? null; }
  async createCandidateAccount(input: CandidateRegistrationRecord) {
    const user: StoredUser = {
      id: randomUUID(), email: input.email, passwordHash: input.passwordHash, kind: 'candidate', status: 'active',
    };
    this.users.set(user.id, user); this.byEmail.set(user.email, user); return user;
  }
  async createCompanyOwnerAccount(input: CompanyRegistrationRecord) {
    const user: StoredUser = {
      id: randomUUID(), email: input.email, passwordHash: input.passwordHash, kind: 'company_member', status: 'active',
    };
    const companyId = randomUUID();
    const membership: StoredCompanyMembership = {
      id: randomUUID(), companyId, userId: user.id, role: 'company_owner', status: 'active',
    };
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

interface StoredList extends SavedListDetail { companyId: string; }

class MemorySavedListsRepository implements SavedListsRepository {
  readonly availableCandidateId = randomUUID();
  private lists = new Map<string, StoredList>();

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
    const list: StoredList = {
      id: randomUUID(), companyId, name: input.name, description: input.description ?? null,
      candidateCount: 0, candidateIds: [], createdAt: now, updatedAt: now,
    };
    this.lists.set(list.id, list);
    const { companyId: _companyId, ...detail } = list;
    return detail;
  }

  async update(companyId: string, listId: string, input: SavedListInput): Promise<SavedListDetail | null> {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return null;
    list.name = input.name; list.description = input.description ?? null; list.updatedAt = new Date();
    return this.get(companyId, listId);
  }

  async delete(companyId: string, listId: string): Promise<boolean> {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return false;
    return this.lists.delete(listId);
  }

  async addCandidate(companyId: string, listId: string, candidateId: string, _actorUserId: string): Promise<AddCandidateResult> {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return 'list_not_found';
    if (candidateId !== this.availableCandidateId) return 'candidate_not_found';
    if (!list.candidateIds.includes(candidateId)) list.candidateIds.push(candidateId);
    list.candidateCount = list.candidateIds.length; list.updatedAt = new Date();
    return 'ok';
  }

  async removeCandidate(companyId: string, listId: string, candidateId: string): Promise<boolean | null> {
    const list = this.lists.get(listId);
    if (!list || list.companyId !== companyId) return null;
    const before = list.candidateIds.length;
    list.candidateIds = list.candidateIds.filter((id) => id !== candidateId);
    list.candidateCount = list.candidateIds.length;
    return before !== list.candidateIds.length;
  }
}

const password = 'correct-horse-battery-staple';

async function registerCompany(app: ReturnType<typeof createApp>, email: string, cr: string) {
  await request(app).post('/api/v1/auth/register/company').send({
    email, password, companyName: `Company ${cr}`, countryCode: 'jo', city: 'Amman', commercialRegistrationNumber: cr,
  });
  const login = await request(app).post('/api/v1/auth/login').send({ email, password, clientType: 'mobile' });
  return login.body.data.sessionToken as string;
}

async function registerCandidate(app: ReturnType<typeof createApp>) {
  await request(app).post('/api/v1/auth/register/candidate').send({
    email: 'candidate-saved@example.com', password, displayName: 'Candidate', countryCode: 'jo', city: 'Amman',
  });
  const login = await request(app).post('/api/v1/auth/login').send({
    email: 'candidate-saved@example.com', password, clientType: 'mobile',
  });
  return login.body.data.sessionToken as string;
}

describe('Saved Lists API', () => {
  it('creates and lists Saved Lists only inside the authenticated company tenant', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const repository = new MemorySavedListsRepository();
    const app = createApp({ authService: auth, savedListsService: new SavedListsService(repository), secureCookies: false });
    const tokenA = await registerCompany(app, 'owner-a@example.com', 'CR-A');
    const tokenB = await registerCompany(app, 'owner-b@example.com', 'CR-B');

    const created = await request(app)
      .post('/api/v1/saved-lists')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ name: 'Sales Leaders', description: 'People to revisit' });
    expect(created.status).toBe(201);
    const listId = created.body.data.id as string;

    const own = await request(app).get('/api/v1/saved-lists').set('authorization', `Bearer ${tokenA}`);
    expect(own.status).toBe(200);
    expect(own.body.data).toHaveLength(1);

    const foreignRead = await request(app).get(`/api/v1/saved-lists/${listId}`).set('authorization', `Bearer ${tokenB}`);
    expect(foreignRead.status).toBe(404);
    expect(foreignRead.body.error.code).toBe('LIST_NOT_FOUND');
  });

  it('blocks candidate accounts from company Saved Lists', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const app = createApp({ authService: auth, savedListsService: new SavedListsService(new MemorySavedListsRepository()), secureCookies: false });
    const token = await registerCandidate(app);
    const response = await request(app).get('/api/v1/saved-lists').set('authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows saving a discoverable candidate and rejects unavailable candidates', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const repository = new MemorySavedListsRepository();
    const app = createApp({ authService: auth, savedListsService: new SavedListsService(repository), secureCookies: false });
    const token = await registerCompany(app, 'owner-save@example.com', 'CR-SAVE');
    const created = await request(app).post('/api/v1/saved-lists').set('authorization', `Bearer ${token}`).send({ name: 'Shortlist' });
    const listId = created.body.data.id as string;

    const added = await request(app)
      .post(`/api/v1/saved-lists/${listId}/candidates`)
      .set('authorization', `Bearer ${token}`)
      .send({ candidateId: repository.availableCandidateId });
    expect(added.status).toBe(201);
    expect(added.body.data.candidateIds).toEqual([repository.availableCandidateId]);

    const unavailable = await request(app)
      .post(`/api/v1/saved-lists/${listId}/candidates`)
      .set('authorization', `Bearer ${token}`)
      .send({ candidateId: randomUUID() });
    expect(unavailable.status).toBe(404);
    expect(unavailable.body.error.code).toBe('CANDIDATE_NOT_AVAILABLE');
  });
});
