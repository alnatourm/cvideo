import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { InterviewActor } from './repository.js';
import type { InterviewsService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

function routeParam(req: AuthenticatedRequest, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0]! : value!;
}

function actor(req: AuthenticatedRequest): InterviewActor {
  const principal = req.security!.principal;
  return { userId: principal.userId, companyId: principal.companyId };
}

export function createInterviewsRouter(authService: AuthService, service: InterviewsService) {
  const router = Router();
  router.use(
    authenticate(authService),
    requireRoles('company_owner', 'company_admin', 'recruiter', 'candidate'),
  );

  router.get('/', asyncHandler(async (req, res) => {
    res.json({ data: await service.list(actor(req)) });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.create(actor(req), req.body) });
  }));

  router.get('/:interviewId', asyncHandler(async (req, res) => {
    res.json({ data: await service.get(actor(req), routeParam(req, 'interviewId')) });
  }));

  router.post('/:interviewId/accept', asyncHandler(async (req, res) => {
    res.json({ data: await service.accept(actor(req), routeParam(req, 'interviewId')) });
  }));

  router.post('/:interviewId/suggest-time', asyncHandler(async (req, res) => {
    res.json({ data: await service.suggestTime(actor(req), routeParam(req, 'interviewId'), req.body) });
  }));

  router.post('/:interviewId/decline', asyncHandler(async (req, res) => {
    res.json({ data: await service.decline(actor(req), routeParam(req, 'interviewId'), req.body) });
  }));

  router.post('/:interviewId/cancel', asyncHandler(async (req, res) => {
    res.json({ data: await service.cancel(actor(req), routeParam(req, 'interviewId')) });
  }));

  return router;
}
