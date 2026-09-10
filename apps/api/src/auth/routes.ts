import { Router, type RequestHandler, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AuthenticatedRequest } from './middleware.js';
import { authenticate, SESSION_COOKIE } from './middleware.js';
import type { AuthService } from './service.js';

export interface AuthRouterOptions {
  secureCookies?: boolean;
}

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many registration attempts', details: {} } },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts', details: {} } },
});

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

export function createAuthRouter(authService: AuthService, options: AuthRouterOptions = {}) {
  const router = Router();
  const isLocalRuntime = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const secureCookies = options.secureCookies ?? !isLocalRuntime;

  router.post('/register/candidate', registrationLimiter, asyncHandler(async (req, res) => {
    const account = await authService.registerCandidate(req.body);
    res.status(201).json({ data: account });
  }));

  router.post('/register/company', registrationLimiter, asyncHandler(async (req, res) => {
    const account = await authService.registerCompany(req.body);
    res.status(201).json({ data: account });
  }));

  router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const session = await authService.login(req.body);

    if (session.principal.clientType === 'web') {
      res.cookie(SESSION_COOKIE, session.sessionToken, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'strict',
        path: '/',
        expires: session.expiresAt,
      });
      res.json({
        data: {
          principal: session.principal,
          csrfToken: session.csrfToken,
          expiresAt: session.expiresAt.toISOString(),
        },
      });
      return;
    }

    res.json({
      data: {
        principal: session.principal,
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  }));

  router.get('/me', authenticate(authService), asyncHandler(async (req, res) => {
    res.json({ data: { principal: req.security!.principal } });
  }));

  router.post('/logout', authenticate(authService), asyncHandler(async (req, res) => {
    await authService.logout(req.security!.rawSessionToken);
    if (req.security!.transport === 'cookie') {
      res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: 'strict',
        path: '/',
      });
    }
    res.status(204).end();
  }));

  return router;
}
