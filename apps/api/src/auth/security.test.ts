import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { authenticate, canAssignCompanyRole, requireTenantIdParam } from './middleware.js';
import type {
  AuthRepository,
  CandidateRegistrationRecord,
  CompanyRegistrationRecord,
  StoredCompanyMembership,
  StoredSession,
  StoredUser,
} from './repository.js';
import { AuthService } from './service.js';

class MemoryAuthRepository implements AuthRepository {
  private sequence = 0;
  private readonly usersById = new Map<string, StoredUser>();
  private readonly usersByEmail = new Map<string, StoredUser>();
  private readonly membershipsByUser = new Map<string, StoredCompanyMembership>();
  private readonly sessionsByHash = new Map<string, StoredSession>();

  private id(prefix: string) {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  async findUserByEmail(email: string) {
    return this.usersByEmail.get(email) ?? null;
  }

  async findUserById(userId: string) {
    return this.usersById.get(userId) ?? null;
  }

  async createCandidateAccount(input: CandidateRegistrationRecord) {
    const user: StoredUser = {
      id: this.id('user'),
      email: input.email,
      passwordHash: input.passwordHash,
      kind: 'candidate',
      status: 'active',
    };
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async createCompanyOwnerAccount(input: CompanyRegistrationRecord) {
    const user: StoredUser = {
      id: this.id('user'),
      email: input.email,
      passwordHash: input.passwordHash,
      kind: 'company_member',
      status: 'active',
    };
    const companyId = this.id('company');
    const membership: StoredCompanyMembership = {
      id: this.id('member'),
      companyId,
      userId: user.id,
      role: 'company_owner',
      status: 'active',
    };
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    this.membershipsByUser.set(user.id, membership);
    return { user, companyId, memberId: membership.id };
  }

  async findActiveMembershipByUserId(userId: string) {
    const membership = this.membershipsByUser.get(userId);
    return membership?.status === 'active' ? membership : null;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    csrfHash: string | null;
    clientType: 'web' | 'mobile';
    expiresAt: Date;
  }) {
    const session: StoredSession = {
      id: this.id('session'),
      ...input,
      revokedAt: null,
    };
    this.sessionsByHash.set(session.tokenHash, session);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string) {
    const session = this.sessionsByHash.get(tokenHash);
    return session && !session.revokedAt ? session : null;
  }

  async revokeSessionByTokenHash(tokenHash: string) {
    const session = this.sessionsByHash.get(tokenHash);
    if (session) session.revokedAt = new Date();
  }

  async touchSession(_sessionId: string, _at: Date) {}
}

function candidateRegistration() {
  return {
    email: 'candidate@example.com',
    password: 'correct-horse-battery-staple',
    displayName: 'Candidate One',
    countryCode: 'jo',
    city: 'Amman',
  };
}

function companyRegistration() {
  return {
    email: 'owner@example.com',
    password: 'correct-horse-battery-staple',
    companyName: 'Example Company',
    countryCode: 'jo',
    city: 'Amman',
    commercialRegistrationNumber: 'CR-100',
  };
}

describe('CVIDEO security boundary', () => {
  it('uses HttpOnly web sessions and requires CSRF for unsafe cookie requests', async () => {
    const repo = new MemoryAuthRepository();
    const service = new AuthService(repo);
    const app = createApp({ authService: service, secureCookies: false });
    const agent = request.agent(app);

    expect((await agent.post('/api/v1/auth/register/candidate').send(candidateRegistration())).status).toBe(201);

    const login = await agent.post('/api/v1/auth/login').send({
      email: 'candidate@example.com',
      password: 'correct-horse-battery-staple',
      clientType: 'web',
    });

    expect(login.status).toBe(200);
    expect(login.body.data.principal.effectiveRole).toBe('candidate');
    expect(login.body.data.sessionToken).toBeUndefined();
    expect(login.body.data.csrfToken).toEqual(expect.any(String));
    const cookie = login.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');

    const me = await agent.get('/api/v1/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.principal.email).toBe('candidate@example.com');

    const blockedLogout = await agent.post('/api/v1/auth/logout');
    expect(blockedLogout.status).toBe(403);
    expect(blockedLogout.body.error.code).toBe('CSRF_INVALID');

    const logout = await agent
      .post('/api/v1/auth/logout')
      .set('x-csrf-token', login.body.data.csrfToken);
    expect(logout.status).toBe(204);

    expect((await agent.get('/api/v1/auth/me')).status).toBe(401);
  });

  it('issues bearer sessions for mobile company members without exposing another tenant', async () => {
    const repo = new MemoryAuthRepository();
    const service = new AuthService(repo);
    const app = createApp({ authService: service, secureCookies: false });

    const registration = await request(app).post('/api/v1/auth/register/company').send(companyRegistration());
    expect(registration.status).toBe(201);
    expect(registration.body.data.verificationStatus).toBe('pending');
    const companyId = registration.body.data.companyId as string;

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'correct-horse-battery-staple',
      clientType: 'mobile',
    });
    expect(login.status).toBe(200);
    expect(login.body.data.principal.effectiveRole).toBe('company_owner');
    expect(login.body.data.principal.companyId).toBe(companyId);
    expect(login.body.data.sessionToken).toEqual(expect.any(String));
    expect(login.headers['set-cookie']).toBeUndefined();

    const token = login.body.data.sessionToken as string;
    const probe = express();
    probe.get(
      '/companies/:companyId',
      authenticate(service),
      requireTenantIdParam('companyId'),
      (_req, res) => res.json({ ok: true }),
    );

    expect((await request(probe).get(`/companies/${companyId}`).set('authorization', `Bearer ${token}`)).status).toBe(200);
    const crossTenant = await request(probe)
      .get('/companies/company-other')
      .set('authorization', `Bearer ${token}`);
    expect(crossTenant.status).toBe(403);
  });

  it('returns the same invalid-credentials error for missing users and wrong passwords', async () => {
    const repo = new MemoryAuthRepository();
    const service = new AuthService(repo);
    const app = createApp({ authService: service, secureCookies: false });
    await request(app).post('/api/v1/auth/register/candidate').send(candidateRegistration());

    const wrong = await request(app).post('/api/v1/auth/login').send({
      email: 'candidate@example.com',
      password: 'wrong-password',
      clientType: 'mobile',
    });
    const missing = await request(app).post('/api/v1/auth/login').send({
      email: 'missing@example.com',
      password: 'wrong-password',
      clientType: 'mobile',
    });

    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(missing.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('enforces the company role assignment hierarchy', () => {
    expect(canAssignCompanyRole('company_owner', 'company_admin')).toBe(true);
    expect(canAssignCompanyRole('company_owner', 'recruiter')).toBe(true);
    expect(canAssignCompanyRole('company_admin', 'company_owner')).toBe(false);
    expect(canAssignCompanyRole('company_admin', 'recruiter')).toBe(true);
    expect(canAssignCompanyRole('recruiter', 'company_admin')).toBe(false);
    expect(canAssignCompanyRole('candidate', 'recruiter')).toBe(false);
    expect(canAssignCompanyRole('super_admin', 'company_owner')).toBe(true);
  });
});
