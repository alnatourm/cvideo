import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { AuthService } from '../auth/service.js';
import type { CompanyMemberRecord, CompanyProfileRecord, CompanyProfileUpdate, CompanyRepository } from './repository.js';
import { CompanyService } from './service.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const recruiterId = '44444444-4444-4444-8444-444444444444';
const foreignId = '55555555-5555-4555-8555-555555555555';

class MemoryCompanyRepository implements CompanyRepository {
  profile: CompanyProfileRecord = { id: companyId, name: 'Example Co', countryCode: 'JO', city: 'Amman', commercialRegistrationNumber: 'CR-1', industry: null, companySize: null, website: null, description: null, verificationStatus: 'pending', operationalStatus: 'active' };
  members: CompanyMemberRecord[] = [
    { id: ownerId, email: 'owner@example.com', role: 'company_owner', status: 'active', createdAt: new Date('2026-01-01') },
    { id: adminId, email: 'admin@example.com', role: 'company_admin', status: 'active', createdAt: new Date('2026-01-02') },
    { id: recruiterId, email: 'recruiter@example.com', role: 'recruiter', status: 'active', createdAt: new Date('2026-01-03') },
  ];
  audit: string[] = [];
  async getProfile(id: string) { return id === companyId ? this.profile : null; }
  async updateProfile(id: string, _actor: string, input: CompanyProfileUpdate) { if (id !== companyId) return null; this.profile = { ...this.profile, ...input }; this.audit.push('company.profile_updated'); return this.profile; }
  async listMembers(id: string) { return id === companyId ? this.members : []; }
  async getMember(id: string, memberId: string) { return id === companyId ? this.members.find((member) => member.id === memberId) ?? null : null; }
  async updateMember(id: string, memberId: string, _actor: string, input: { role: CompanyMemberRecord['role']; status: CompanyMemberRecord['status'] }) {
    if (id !== companyId) return null;
    const member = this.members.find((item) => item.id === memberId);
    if (!member) return null;
    Object.assign(member, input); this.audit.push('company.member_updated'); return member;
  }
}

function authServiceStub(): AuthService {
  return {
    async authenticateSession(token: string) {
      const role = token.startsWith('owner') ? 'company_owner' : token.startsWith('admin') ? 'company_admin' : token.startsWith('recruiter') ? 'recruiter' : 'candidate';
      const memberId = role === 'company_owner' ? ownerId : role === 'company_admin' ? adminId : role === 'recruiter' ? recruiterId : null;
      const companyMember = role !== 'candidate';
      return { tokenHash: 'hash', csrfHash: null, principal: { userId: `${role}-user`, email: `${role}@example.com`, kind: companyMember ? 'company_member' : 'candidate', effectiveRole: role, companyId: companyMember ? (token.endsWith('-foreign') ? '66666666-6666-4666-8666-666666666666' : companyId) : null, companyMemberId: memberId, sessionId: 'session-1', clientType: 'mobile' } };
    },
    verifyCsrf() {},
  } as unknown as AuthService;
}

function testApp(repository = new MemoryCompanyRepository()) {
  return createApp({ authService: authServiceStub(), companyService: new CompanyService(repository) });
}

describe('company account and members', () => {
  it('allows company roles to read their tenant profile but blocks candidates', async () => {
    expect((await request(testApp()).get('/api/v1/companies/me').set('authorization', 'Bearer candidate-token')).status).toBe(403);
    const response = await request(testApp()).get('/api/v1/companies/me').set('authorization', 'Bearer recruiter-token');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Example Co', commercialRegistrationNumber: 'CR-1' });
  });

  it('allows owners/admins to update safe profile fields but keeps recruiters read-only', async () => {
    const payload = { name: 'Updated Co', city: 'Irbid', industry: 'Software', companySize: '11-50', website: 'https://example.com', description: 'Company profile' };
    expect((await request(testApp()).put('/api/v1/companies/me').set('authorization', 'Bearer recruiter-token').send(payload)).status).toBe(403);
    const repository = new MemoryCompanyRepository();
    const response = await request(testApp(repository)).put('/api/v1/companies/me').set('authorization', 'Bearer owner-token').send(payload);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Updated Co', countryCode: 'JO', commercialRegistrationNumber: 'CR-1' });
    expect(repository.audit).toContain('company.profile_updated');
  });

  it('enforces role hierarchy, prevents self/owner edits, and audits allowed changes', async () => {
    const repository = new MemoryCompanyRepository();
    const app = testApp(repository);
    expect((await request(app).put(`/api/v1/company/members/${ownerId}`).set('authorization', 'Bearer admin-token').send({ role: 'recruiter', status: 'active' })).status).toBe(403);
    expect((await request(app).put(`/api/v1/company/members/${adminId}`).set('authorization', 'Bearer admin-token').send({ role: 'recruiter', status: 'active' })).status).toBe(403);
    const allowed = await request(app).put(`/api/v1/company/members/${recruiterId}`).set('authorization', 'Bearer admin-token').send({ role: 'recruiter', status: 'suspended' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.status).toBe('suspended');
    expect(repository.audit).toContain('company.member_updated');
  });

  it('blocks recruiter mutation and cross-tenant member IDs', async () => {
    const app = testApp();
    expect((await request(app).put(`/api/v1/company/members/${adminId}`).set('authorization', 'Bearer recruiter-token').send({ role: 'company_admin', status: 'active' })).status).toBe(403);
    expect((await request(app).put(`/api/v1/company/members/${foreignId}`).set('authorization', 'Bearer owner-token').send({ role: 'recruiter', status: 'active' })).status).toBe(404);
    const foreignList = await request(app).get('/api/v1/company/members').set('authorization', 'Bearer owner-foreign');
    expect(foreignList.status).toBe(200);
    expect(foreignList.body.data).toEqual([]);
  });
});
