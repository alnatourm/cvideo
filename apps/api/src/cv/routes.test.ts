import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { AuthService } from '../auth/service.js';
import type { DocumentProvider, StoredDocument } from './provider.js';
import type { CandidateCvRecord, CvRepository } from './repository.js';
import { CvService } from './service.js';

const candidateId = '11111111-1111-4111-8111-111111111111';
const pdf = Buffer.from('%PDF-1.7\nroute test');

class RouteRepository implements CvRepository {
  record: CandidateCvRecord = { candidateId, storageKey: 'candidate-cv/test.pdf', originalFilename: 'private-resume.pdf' };
  discoverable = true;
  async getByUserId() { return this.record; }
  async getDiscoverableByCandidateId() { return this.discoverable ? this.record : null; }
  async setByUserId(_userId: string, storageKey: string, originalFilename: string) {
    this.record = { ...this.record, storageKey, originalFilename };
    return this.record;
  }
  async clearByUserId() { const previous = this.record; this.record = { ...this.record, storageKey: null, originalFilename: null }; return previous; }
}

class RouteProvider implements DocumentProvider {
  data = pdf;
  async putObject(_key: string, body: AsyncIterable<Uint8Array>) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body) chunks.push(chunk);
    this.data = Buffer.concat(chunks);
  }
  async getObject(): Promise<StoredDocument> { return { body: (async function* (data) { yield data; })(this.data), sizeBytes: this.data.byteLength }; }
  async deleteObject() {}
}

function authServiceStub(): AuthService {
  return {
    async authenticateSession(token: string) {
      const candidate = token === 'candidate-token';
      const tenantless = token === 'tenantless-token';
      return {
        tokenHash: 'hash', csrfHash: null,
        principal: {
          userId: candidate ? 'candidate-user' : 'recruiter-user',
          email: 'user@example.com',
          kind: candidate ? 'candidate' : 'company_member',
          effectiveRole: candidate ? 'candidate' : 'recruiter',
          companyId: candidate || tenantless ? null : 'company-1',
          companyMemberId: candidate || tenantless ? null : 'member-1',
          sessionId: 'session-1', clientType: 'mobile',
        },
      };
    },
    verifyCsrf() {},
  } as unknown as AuthService;
}

function testApp(repository = new RouteRepository()) {
  return createApp({ authService: authServiceStub(), cvService: new CvService(repository, new RouteProvider()) });
}

describe('private CV routes', () => {
  it('allows only the owning candidate to replace their CV and never returns a storage key', async () => {
    const blocked = await request(testApp()).put('/api/v1/candidate/cv/content').set('authorization', 'Bearer recruiter-token').set('content-type', 'application/pdf').set('x-file-name', 'resume.pdf').send(pdf);
    expect(blocked.status).toBe(403);

    const allowed = await request(testApp()).put('/api/v1/candidate/cv/content').set('authorization', 'Bearer candidate-token').set('content-type', 'application/pdf').set('x-file-name', 'resume.pdf').send(pdf);
    expect(allowed.status).toBe(201);
    expect(allowed.body.data).toEqual({ filename: 'resume.pdf' });
    expect(allowed.body.data.storageKey).toBeUndefined();
  });

  it('requires recruiter role and company tenant for recruiter download', async () => {
    const candidate = await request(testApp()).get(`/api/v1/search/candidates/${candidateId}/cv`).set('authorization', 'Bearer candidate-token');
    expect(candidate.status).toBe(403);
    const tenantless = await request(testApp()).get(`/api/v1/search/candidates/${candidateId}/cv`).set('authorization', 'Bearer tenantless-token');
    expect(tenantless.status).toBe(403);
    const recruiter = await request(testApp()).get(`/api/v1/search/candidates/${candidateId}/cv`).set('authorization', 'Bearer recruiter-token');
    expect(recruiter.status).toBe(200);
    expect(recruiter.headers['content-type']).toContain('application/pdf');
    expect(recruiter.headers['content-disposition']).toContain('private-resume.pdf');
  });

  it('returns 404 instead of serving a private candidate CV when discovery is off', async () => {
    const repository = new RouteRepository();
    repository.discoverable = false;
    const response = await request(testApp(repository)).get(`/api/v1/search/candidates/${candidateId}/cv`).set('authorization', 'Bearer recruiter-token');
    expect(response.status).toBe(404);
  });
});
