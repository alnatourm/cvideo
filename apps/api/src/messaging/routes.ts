import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { MessagingActor } from './repository.js';
import type { MessagingService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

function routeParam(req: AuthenticatedRequest, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0]! : value!;
}

function actor(req: AuthenticatedRequest): MessagingActor {
  const principal = req.security!.principal;
  return { userId: principal.userId, companyId: principal.companyId };
}

export function createMessagingRouter(authService: AuthService, service: MessagingService) {
  const router = Router();
  router.use(
    authenticate(authService),
    requireRoles('company_owner', 'company_admin', 'recruiter', 'candidate'),
  );

  router.get('/', asyncHandler(async (req, res) => {
    res.json({ data: await service.list(actor(req)) });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const conversation = await service.create(actor(req), req.body);
    res.status(conversation.existing ? 200 : 201).json({ data: conversation });
  }));

  router.get('/:conversationId', asyncHandler(async (req, res) => {
    res.json({ data: await service.get(actor(req), routeParam(req, 'conversationId')) });
  }));

  router.get('/:conversationId/messages', asyncHandler(async (req, res) => {
    const limit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    res.json({ data: await service.listMessages(actor(req), routeParam(req, 'conversationId'), limit) });
  }));

  router.post('/:conversationId/messages', asyncHandler(async (req, res) => {
    res.status(201).json({
      data: await service.sendMessage(actor(req), routeParam(req, 'conversationId'), req.body),
    });
  }));

  return router;
}
