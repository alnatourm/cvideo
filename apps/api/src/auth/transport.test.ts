import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authenticate, SESSION_COOKIE } from './middleware.js';
import type { AuthService } from './service.js';

function fakeAuthService(clientType: 'web' | 'mobile') {
  return {
    async authenticateSession() {
      return {
        tokenHash: 'hash',
        csrfHash: clientType === 'web' ? 'csrf-hash' : null,
        principal: {
          userId: 'user-1',
          email: 'user@example.com',
          kind: clientType === 'web' ? 'candidate' : 'company_member',
          effectiveRole: clientType === 'web' ? 'candidate' : 'recruiter',
          companyId: clientType === 'web' ? null : 'company-1',
          companyMemberId: clientType === 'web' ? null : 'member-1',
          sessionId: 'session-1',
          clientType,
        },
      };
    },
    verifyCsrf() {},
  } as unknown as AuthService;
}

function probeApp(service: AuthService) {
  const app = express();
  app.use(cookieParser());
  app.get('/protected', authenticate(service), (_req, res) => res.json({ ok: true }));
  app.use((error: any, _req: any, res: any, _next: any) => {
    res.status(error.status ?? 500).json({ code: error.code ?? 'ERROR' });
  });
  return app;
}

describe('session transport binding', () => {
  it('rejects a web session presented as a Bearer token', async () => {
    const response = await request(probeApp(fakeAuthService('web')))
      .get('/protected')
      .set('authorization', 'Bearer token');
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a mobile session presented as a cookie', async () => {
    const response = await request(probeApp(fakeAuthService('mobile')))
      .get('/protected')
      .set('cookie', `${SESSION_COOKIE}=token`);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHENTICATED');
  });
});
