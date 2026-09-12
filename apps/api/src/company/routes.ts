import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireCompanyTenant, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { CompanyService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { void handler(req as AuthenticatedRequest, res).catch(next); };
}

export function createCompanyProfileRouter(authService: AuthService, service: CompanyService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('company_owner', 'company_admin', 'recruiter'), requireCompanyTenant());
  router.get('/me', asyncHandler(async (req, res) => {
    res.json({ data: await service.getProfile(req.security!.principal.companyId!) });
  }));
  router.put('/me', requireRoles('company_owner', 'company_admin'), asyncHandler(async (req, res) => {
    res.json({ data: await service.updateProfile(req.security!.principal.companyId!, req.security!.principal.userId, req.body) });
  }));
  return router;
}

export function createCompanyMembersRouter(authService: AuthService, service: CompanyService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('company_owner', 'company_admin', 'recruiter'), requireCompanyTenant());
  router.get('/', asyncHandler(async (req, res) => {
    res.json({ data: await service.listMembers(req.security!.principal.companyId!) });
  }));
  router.put('/:memberId', requireRoles('company_owner', 'company_admin'), asyncHandler(async (req, res) => {
    const principal = req.security!.principal;
    res.json({ data: await service.updateMember(principal.companyId!, principal.companyMemberId!, principal.userId, principal.effectiveRole, req.params.memberId, req.body) });
  }));
  return router;
}
