import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireCompanyTenant, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { SavedListsService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

function routeParam(req: AuthenticatedRequest, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0]! : value!;
}

function context(req: AuthenticatedRequest) {
  const principal = req.security!.principal;
  return { companyId: principal.companyId!, actorUserId: principal.userId };
}

export function createSavedListsRouter(authService: AuthService, service: SavedListsService) {
  const router = Router();
  router.use(
    authenticate(authService),
    requireRoles('company_owner', 'company_admin', 'recruiter'),
    requireCompanyTenant(),
  );

  router.get('/', asyncHandler(async (req, res) => {
    const { companyId } = context(req);
    res.json({ data: await service.list(companyId) });
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const { companyId, actorUserId } = context(req);
    res.status(201).json({ data: await service.create(companyId, actorUserId, req.body) });
  }));

  router.get('/:listId', asyncHandler(async (req, res) => {
    const { companyId } = context(req);
    res.json({ data: await service.get(companyId, routeParam(req, 'listId')) });
  }));

  router.put('/:listId', asyncHandler(async (req, res) => {
    const { companyId } = context(req);
    res.json({ data: await service.update(companyId, routeParam(req, 'listId'), req.body) });
  }));

  router.delete('/:listId', asyncHandler(async (req, res) => {
    const { companyId } = context(req);
    await service.delete(companyId, routeParam(req, 'listId'));
    res.status(204).end();
  }));

  router.post('/:listId/candidates', asyncHandler(async (req, res) => {
    const { companyId, actorUserId } = context(req);
    res.status(201).json({
      data: await service.addCandidate(companyId, routeParam(req, 'listId'), actorUserId, req.body),
    });
  }));

  router.delete('/:listId/candidates/:candidateId', asyncHandler(async (req, res) => {
    const { companyId } = context(req);
    await service.removeCandidate(companyId, routeParam(req, 'listId'), routeParam(req, 'candidateId'));
    res.status(204).end();
  }));

  return router;
}
