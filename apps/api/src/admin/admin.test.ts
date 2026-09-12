import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { AuthService } from '../auth/service.js';
import type {
  CompanyOperationalStatus,
  CompanyVerificationDecision,
  CompanyVerificationItem,
  CompanyVerificationRepository,
  CompanyVerificationStatus,
} from './repository.js';
import { CompanyVerificationService } from './service.js';

const verificationId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';

class MemoryVerificationRepository implements CompanyVerificationRepository {
  item: CompanyVerificationItem = {
    id: verificationId,
    companyId,
    companyName: 'Example Company',
    countryCode: 'JO',
    city: 'Amman',
    commercialRegistrationNumber: 'CR-100',
    submittedByEmail: 'owner@example.com',
    verificationStatus: 'pending',
    operationalStatus: 'active',
    reviewedAt: null,
    rejectionReason: null,
    reviewNote: null,
    createdAt: new Date('2026-09-12T00:00:00.000Z'),
  };
  audit: string[] = [];

  async listVerifications(status?: CompanyVerificationStatus) { return !status || this.item.verificationStatus === status ? [this.item] : []; }
  async getCompanyStatusByUserId() { return this.item; }
  async decideVerification(input: CompanyVerificationDecision) {
    if (this.item.verificationStatus !== 'pending') return null;
    this.item = { ...this.item, verificationStatus: input.status, reviewedAt: new Date(), rejectionReason: input.rejectionReason, reviewNote: input.reviewNote };
    this.audit.push(`company_verification.${input.status}`);
    return this.item;
  }
  async setCompanyOperationalStatus(_companyId: string, status: CompanyOperationalStatus) {
    this.item = { ...this.item, operationalStatus: status };
    this.audit.push(`company.${status}`);
    return this.item;
  }
}

function authServiceStub(): AuthService {
  return {
    async authenticateSession(token: string) {
      const admin = token === 'admin-token';
      const company = token === 'company-token';
      return {
        tokenHash: 'hash', csrfHash: null,
        principal: {
          userId: admin ? 'admin-user' : company ? 'company-user' : 'candidate-user',
          email: 'user@example.com',
          kind: admin ? 'super_admin' : company ? 'company_member' : 'candidate',
          effectiveRole: admin ? 'super_admin' : company ? 'company_owner' : 'candidate',
          companyId: company ? companyId : null,
          companyMemberId: company ? 'member-1' : null,
          sessionId: 'session-1', clientType: 'mobile',
        },
      };
    },
    verifyCsrf() {},
  } as unknown as AuthService;
}

function testApp(repository = new MemoryVerificationRepository()) {
  return createApp({ authService: authServiceStub(), companyVerificationService: new CompanyVerificationService(repository) });
}

describe('company verification administration', () => {
  it('keeps admin verification data behind the super-admin boundary', async () => {
    expect((await request(testApp()).get('/api/v1/admin/company-verifications').set('authorization', 'Bearer candidate-token')).status).toBe(403);
    expect((await request(testApp()).get('/api/v1/admin/company-verifications').set('authorization', 'Bearer company-token')).status).toBe(403);
    const allowed = await request(testApp()).get('/api/v1/admin/company-verifications?status=pending').set('authorization', 'Bearer admin-token');
    expect(allowed.status).toBe(200);
    expect(allowed.body.data[0]).toMatchObject({ companyName: 'Example Company', verificationStatus: 'pending' });
  });

  it('approves once, records the decision, and rejects repeat review', async () => {
    const repository = new MemoryVerificationRepository();
    const app = testApp(repository);
    const approved = await request(app).post(`/api/v1/admin/company-verifications/${verificationId}/approve`).set('authorization', 'Bearer admin-token').send({ note: 'Registry checked' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.verificationStatus).toBe('verified');
    expect(repository.audit).toContain('company_verification.verified');
    const repeated = await request(app).post(`/api/v1/admin/company-verifications/${verificationId}/approve`).set('authorization', 'Bearer admin-token').send({});
    expect(repeated.status).toBe(409);
  });

  it('requires a rejection reason and supports audited suspension', async () => {
    const repository = new MemoryVerificationRepository();
    const app = testApp(repository);
    const invalid = await request(app).post(`/api/v1/admin/company-verifications/${verificationId}/reject`).set('authorization', 'Bearer admin-token').send({ reason: '' });
    expect(invalid.status).toBe(400);
    const suspended = await request(app).put(`/api/v1/admin/companies/${companyId}/status`).set('authorization', 'Bearer admin-token').send({ status: 'suspended' });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.operationalStatus).toBe('suspended');
    expect(repository.audit).toContain('company.suspended');
  });

  it('lets a company member read only their server-derived verification status', async () => {
    const response = await request(testApp()).get('/api/v1/companies/me/verification').set('authorization', 'Bearer company-token');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ companyId, commercialRegistrationNumber: 'CR-100' });
    expect(response.body.data.reviewNote).toBeUndefined();
    expect(response.body.data.submittedByEmail).toBeUndefined();
  });
});
