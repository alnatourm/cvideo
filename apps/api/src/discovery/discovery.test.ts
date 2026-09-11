import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import type { AuthService } from '../auth/service.js';
import type { DiscoveryRepository, RecruiterCandidateDetail, RecruiterSearchFilters } from './repository.js';
import { DiscoveryService } from './service.js';

class MemoryDiscoveryRepository implements DiscoveryRepository {
  readiness = {
    candidateId: '11111111-1111-4111-8111-111111111111',
    hasReadyVideo: false,
    hasCategory: true,
    hasPreferredRole: true,
    hasSkill: true,
  };
  visible = false;

  async getReadinessByUserId() { return this.readiness; }
  async getVisibilityByUserId() { return this.visible; }
  async setVisibilityByUserId(_userId: string, discoverable: boolean) { this.visible = discoverable; return this.visible; }

  async searchCandidates(filters: RecruiterSearchFilters) {
    return {
      items: [{
        id: '11111111-1111-4111-8111-111111111111',
        displayName: 'Candidate One',
        headline: 'Sales Manager',
        countryCode: filters.countryCode ?? 'JO',
        city: 'Amman',
        yearsExperience: 8,
        primaryCategoryId: null,
        primarySubcategoryId: null,
        introductionVideoId: '22222222-2222-4222-8222-222222222222',
        introductionVideoUrl: 'https://video.example/playlist.m3u8',
        introductionVideoThumbnailUrl: 'https://video.example/thumb.jpg',
      }],
      nextCursor: null,
    };
  }

  async getCandidateDetail(candidateId: string): Promise<RecruiterCandidateDetail | null> {
    if (candidateId !== '11111111-1111-4111-8111-111111111111') return null;
    return {
      id: candidateId,
      displayName: 'Candidate One',
      headline: 'Sales Manager',
      countryCode: 'JO',
      city: 'Amman',
      yearsExperience: 8,
      primaryCategoryId: null,
      primarySubcategoryId: null,
      introductionVideoId: '22222222-2222-4222-8222-222222222222',
      introductionVideoUrl: 'https://video.example/playlist.m3u8',
      introductionVideoThumbnailUrl: 'https://video.example/thumb.jpg',
      professionalSummary: 'Professional summary',
      preferredRoleIds: [],
      skillIds: [],
      languageIds: [],
      certificates: [],
      experience: [],
      education: [],
    };
  }
}

function authServiceStub(): AuthService {
  return {
    async authenticateSession(token: string) {
      const recruiter = token === 'recruiter-token';
      return {
        tokenHash: 'hash',
        csrfHash: null,
        principal: {
          userId: recruiter ? 'recruiter-user' : 'candidate-user',
          email: recruiter ? 'recruiter@example.com' : 'candidate@example.com',
          kind: recruiter ? 'company_member' : 'candidate',
          effectiveRole: recruiter ? 'recruiter' : 'candidate',
          companyId: recruiter ? 'company-1' : null,
          companyMemberId: recruiter ? 'member-1' : null,
          sessionId: 'session-1',
          clientType: 'mobile',
        },
      };
    },
    verifyCsrf() {},
  } as unknown as AuthService;
}

describe('CVIDEO discovery', () => {
  it('does not allow discovery until the candidate has a ready Introduction Video', async () => {
    const repo = new MemoryDiscoveryRepository();
    const service = new DiscoveryService(repo);
    await expect(service.setOwnVisibility('candidate-user', { discoverable: true })).rejects.toMatchObject({ code: 'DISCOVERY_NOT_READY', status: 409 });
    repo.readiness.hasReadyVideo = true;
    await expect(service.setOwnVisibility('candidate-user', { discoverable: true })).resolves.toEqual({ discoverable: true });
  });

  it('blocks candidates from recruiter search and returns only recruiter-safe playback data', async () => {
    const repo = new MemoryDiscoveryRepository();
    repo.readiness.hasReadyVideo = true;
    const app = createApp({ authService: authServiceStub(), discoveryService: new DiscoveryService(repo) });

    const blocked = await request(app).get('/api/v1/search/candidates').set('authorization', 'Bearer candidate-token');
    expect(blocked.status).toBe(403);

    const allowed = await request(app).get('/api/v1/search/candidates?countryCode=jo&pageSize=10').set('authorization', 'Bearer recruiter-token');
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.items).toHaveLength(1);
    expect(allowed.body.data.items[0].countryCode).toBe('JO');
    expect(allowed.body.data.items[0].introductionVideoUrl).toContain('playlist.m3u8');
    expect(allowed.body.data.items[0].passwordHash).toBeUndefined();
    expect(allowed.body.data.items[0].email).toBeUndefined();
    expect(allowed.body.data.items[0].storageKey).toBeUndefined();
  });
});
