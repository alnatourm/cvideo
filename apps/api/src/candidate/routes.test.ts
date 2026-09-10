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
  CandidateCertificateInput,
  CandidateCertificateRecord,
  CandidateEducationInput,
  CandidateEducationRecord,
  CandidateExperienceInput,
  CandidateExperienceRecord,
  CandidateOwnProfile,
  CandidateProfileUpdate,
  CandidateRepository,
} from './repository.js';
import { CandidateService } from './service.js';

class MemoryAuthRepository implements AuthRepository {
  private sequence = 0;
  private users = new Map<string, StoredUser>();
  private byEmail = new Map<string, StoredUser>();
  private memberships = new Map<string, StoredCompanyMembership>();
  private sessions = new Map<string, StoredSession>();
  private id(prefix: string) { this.sequence += 1; return `${prefix}-${this.sequence}`; }
  async findUserByEmail(email: string) { return this.byEmail.get(email) ?? null; }
  async findUserById(id: string) { return this.users.get(id) ?? null; }
  async createCandidateAccount(input: CandidateRegistrationRecord) {
    const user: StoredUser = { id: this.id('user'), email: input.email, passwordHash: input.passwordHash, kind: 'candidate', status: 'active' };
    this.users.set(user.id, user); this.byEmail.set(user.email, user); return user;
  }
  async createCompanyOwnerAccount(input: CompanyRegistrationRecord) {
    const user: StoredUser = { id: this.id('user'), email: input.email, passwordHash: input.passwordHash, kind: 'company_member', status: 'active' };
    const companyId = this.id('company');
    const membership: StoredCompanyMembership = { id: this.id('member'), companyId, userId: user.id, role: 'company_owner', status: 'active' };
    this.users.set(user.id, user); this.byEmail.set(user.email, user); this.memberships.set(user.id, membership);
    return { user, companyId, memberId: membership.id };
  }
  async findActiveMembershipByUserId(userId: string) { return this.memberships.get(userId) ?? null; }
  async createSession(input: { userId: string; tokenHash: string; csrfHash: string | null; clientType: 'web' | 'mobile'; expiresAt: Date }) {
    const session: StoredSession = { id: this.id('session'), ...input, revokedAt: null };
    this.sessions.set(input.tokenHash, session); return session;
  }
  async findSessionByTokenHash(hash: string) { const s = this.sessions.get(hash); return s && !s.revokedAt ? s : null; }
  async revokeSessionByTokenHash(hash: string) { const s = this.sessions.get(hash); if (s) s.revokedAt = new Date(); }
  async touchSession(_sessionId: string, _at: Date) {}
}

class MemoryCandidateRepository implements CandidateRepository {
  lastUserId: string | null = null;
  private profile: CandidateOwnProfile = {
    id: 'profile-1', displayName: 'Candidate One', headline: null, profilePhotoUrl: null,
    countryCode: 'JO', city: 'Amman', primaryCategoryId: null, primarySubcategoryId: null,
    yearsExperience: 0, professionalSummary: null, cvOriginalFilename: null,
    extraSubfieldIds: [], preferredRoleIds: [], skillIds: [], languageIds: [],
    experience: [], education: [], certificates: [], video: null,
  };
  async getOwnProfile(userId: string) { this.lastUserId = userId; return this.profile; }
  async updateOwnProfile(userId: string, input: CandidateProfileUpdate) {
    this.lastUserId = userId;
    this.profile = { ...this.profile, ...input, headline: input.headline ?? null, primaryCategoryId: input.primaryCategoryId ?? null, primarySubcategoryId: input.primarySubcategoryId ?? null, professionalSummary: input.professionalSummary ?? null, experience: this.profile.experience, education: this.profile.education, certificates: this.profile.certificates, video: this.profile.video };
    return this.profile;
  }
  async listExperience(userId: string) { this.lastUserId = userId; return this.profile.experience; }
  async createExperience(userId: string, input: CandidateExperienceInput) { this.lastUserId = userId; const r: CandidateExperienceRecord = { id: 'exp-1', ...input }; this.profile.experience.push(r); return r; }
  async updateExperience(userId: string, id: string, input: CandidateExperienceInput) { this.lastUserId = userId; const i = this.profile.experience.findIndex((x) => x.id === id); if (i < 0) return null; const r = { id, ...input }; this.profile.experience[i] = r; return r; }
  async deleteExperience(userId: string, id: string) { this.lastUserId = userId; const n = this.profile.experience.length; this.profile.experience = this.profile.experience.filter((x) => x.id !== id); return n !== this.profile.experience.length; }
  async listEducation(userId: string) { this.lastUserId = userId; return this.profile.education; }
  async createEducation(userId: string, input: CandidateEducationInput) { this.lastUserId = userId; const r: CandidateEducationRecord = { id: 'edu-1', ...input }; this.profile.education.push(r); return r; }
  async updateEducation(userId: string, id: string, input: CandidateEducationInput) { this.lastUserId = userId; const i = this.profile.education.findIndex((x) => x.id === id); if (i < 0) return null; const r = { id, ...input }; this.profile.education[i] = r; return r; }
  async deleteEducation(userId: string, id: string) { this.lastUserId = userId; const n = this.profile.education.length; this.profile.education = this.profile.education.filter((x) => x.id !== id); return n !== this.profile.education.length; }
  async listCertificates(userId: string) { this.lastUserId = userId; return this.profile.certificates; }
  async createCertificate(userId: string, input: CandidateCertificateInput) { this.lastUserId = userId; const r: CandidateCertificateRecord = { id: 'cert-1', ...input }; this.profile.certificates.push(r); return r; }
  async updateCertificate(userId: string, id: string, input: CandidateCertificateInput) { this.lastUserId = userId; const i = this.profile.certificates.findIndex((x) => x.id === id); if (i < 0) return null; const r = { id, ...input }; this.profile.certificates[i] = r; return r; }
  async deleteCertificate(userId: string, id: string) { this.lastUserId = userId; const n = this.profile.certificates.length; this.profile.certificates = this.profile.certificates.filter((x) => x.id !== id); return n !== this.profile.certificates.length; }
}

const password = 'correct-horse-battery-staple';

async function candidateToken(app: ReturnType<typeof createApp>) {
  await request(app).post('/api/v1/auth/register/candidate').send({ email: 'candidate@example.com', password, displayName: 'Candidate One', countryCode: 'jo', city: 'Amman' });
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'candidate@example.com', password, clientType: 'mobile' });
  return { token: login.body.data.sessionToken as string, userId: login.body.data.principal.userId as string };
}

describe('protected candidate API', () => {
  it('binds profile reads and writes to the authenticated candidate user', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const candidateRepo = new MemoryCandidateRepository();
    const app = createApp({ authService: auth, candidateService: new CandidateService(candidateRepo), secureCookies: false });
    const { token, userId } = await candidateToken(app);

    const read = await request(app).get('/api/v1/candidate/profile').set('authorization', `Bearer ${token}`);
    expect(read.status).toBe(200);
    expect(candidateRepo.lastUserId).toBe(userId);

    const update = await request(app).put('/api/v1/candidate/profile').set('authorization', `Bearer ${token}`).send({
      displayName: 'Updated Candidate', headline: 'Sales Manager', countryCode: 'jo', city: 'Amman',
      extraSubfieldIds: [], preferredRoleIds: [], skillIds: [], languageIds: [], yearsExperience: 7,
      professionalSummary: 'Professional profile summary',
    });
    expect(update.status).toBe(200);
    expect(update.body.data.displayName).toBe('Updated Candidate');
    expect(candidateRepo.lastUserId).toBe(userId);
  });

  it('blocks company members from candidate-owned routes', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const app = createApp({ authService: auth, candidateService: new CandidateService(new MemoryCandidateRepository()), secureCookies: false });
    await request(app).post('/api/v1/auth/register/company').send({
      email: 'owner@example.com', password, companyName: 'Example Co', countryCode: 'jo', city: 'Amman', commercialRegistrationNumber: 'CR-1',
    });
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'owner@example.com', password, clientType: 'mobile' });
    const response = await request(app).get('/api/v1/candidate/profile').set('authorization', `Bearer ${login.body.data.sessionToken}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('does not allow an authenticated candidate to update a missing foreign subresource', async () => {
    const auth = new AuthService(new MemoryAuthRepository());
    const candidateRepo = new MemoryCandidateRepository();
    const app = createApp({ authService: auth, candidateService: new CandidateService(candidateRepo), secureCookies: false });
    const { token } = await candidateToken(app);
    const response = await request(app).put('/api/v1/candidate/experience/foreign-id').set('authorization', `Bearer ${token}`).send({
      companyName: 'Other Company', jobTitle: 'Manager', startDate: '2024-01-01', isCurrent: true,
    });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });
});
