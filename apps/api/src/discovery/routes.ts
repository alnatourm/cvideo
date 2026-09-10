import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireCompanyTenant, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { DiscoveryService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

function single(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function recruiterQuery(req: AuthenticatedRequest) {
  return {
    countryCode: single(req.query.countryCode),
    city: single(req.query.city),
    categoryId: single(req.query.categoryId),
    subcategoryId: single(req.query.subcategoryId),
    preferredRoleId: single(req.query.preferredRoleId),
    skillId: single(req.query.skillId),
    languageId: single(req.query.languageId),
    minExperienceYears: single(req.query.minExperienceYears),
    cursor: single(req.query.cursor),
    pageSize: single(req.query.pageSize),
  };
}

export function createCandidateDiscoveryRouter(authService: AuthService, discoveryService: DiscoveryService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('candidate'));

  router.get('/visibility', asyncHandler(async (req, res) => {
    res.json({ data: await discoveryService.getOwnVisibility(req.security!.principal.userId) });
  }));

  router.put('/visibility', asyncHandler(async (req, res) => {
    res.json({ data: await discoveryService.setOwnVisibility(req.security!.principal.userId, req.body) });
  }));

  return router;
}

export function createRecruiterDiscoveryRouter(authService: AuthService, discoveryService: DiscoveryService) {
  const router = Router();
  router.use(
    authenticate(authService),
    requireRoles('company_owner', 'company_admin', 'recruiter'),
    requireCompanyTenant(),
  );

  router.get('/', asyncHandler(async (req, res) => {
    res.json({ data: await discoveryService.searchCandidates(recruiterQuery(req)) });
  }));

  router.get('/:candidateId', asyncHandler(async (req, res) => {
    const candidateId = single(req.params.candidateId);
    res.json({ data: await discoveryService.getCandidateDetail(candidateId) });
  }));

  return router;
}
