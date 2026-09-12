import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireCompanyTenant, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { CompanyVerificationService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { void handler(req as AuthenticatedRequest, res).catch(next); };
}

export function createAdminRouter(authService: AuthService, service: CompanyVerificationService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('super_admin'));
  router.get('/company-verifications', asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json({ data: await service.list(status) });
  }));
  router.post('/company-verifications/:id/approve', asyncHandler(async (req, res) => {
    res.json({ data: await service.approve(req.params.id, req.security!.principal.userId, req.body) });
  }));
  router.post('/company-verifications/:id/reject', asyncHandler(async (req, res) => {
    res.json({ data: await service.reject(req.params.id, req.security!.principal.userId, req.body) });
  }));
  router.put('/companies/:companyId/status', asyncHandler(async (req, res) => {
    res.json({ data: await service.setOperationalStatus(req.params.companyId, req.security!.principal.userId, req.body) });
  }));
  return router;
}

export function createCompanyVerificationRouter(authService: AuthService, service: CompanyVerificationService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('company_owner', 'company_admin', 'recruiter'), requireCompanyTenant());
  router.get('/me/verification', asyncHandler(async (req, res) => {
    res.json({ data: await service.getOwnStatus(req.security!.principal.userId) });
  }));
  return router;
}
