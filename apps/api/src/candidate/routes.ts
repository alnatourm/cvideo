import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { CandidateService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

function userId(req: AuthenticatedRequest) {
  return req.security!.principal.userId;
}

export function createCandidateRouter(authService: AuthService, candidateService: CandidateService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('candidate'));

  router.get('/profile', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.getOwnProfile(userId(req)) });
  }));

  router.put('/profile', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.updateOwnProfile(userId(req), req.body) });
  }));

  router.get('/profile/completeness', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.profileCompleteness(userId(req)) });
  }));

  router.get('/experience', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.listExperience(userId(req)) });
  }));

  router.post('/experience', asyncHandler(async (req, res) => {
    res.status(201).json({ data: await candidateService.createExperience(userId(req), req.body) });
  }));

  router.put('/experience/:id', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.updateExperience(userId(req), req.params.id!, req.body) });
  }));

  router.delete('/experience/:id', asyncHandler(async (req, res) => {
    await candidateService.deleteExperience(userId(req), req.params.id!);
    res.status(204).end();
  }));

  router.get('/education', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.listEducation(userId(req)) });
  }));

  router.post('/education', asyncHandler(async (req, res) => {
    res.status(201).json({ data: await candidateService.createEducation(userId(req), req.body) });
  }));

  router.put('/education/:id', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.updateEducation(userId(req), req.params.id!, req.body) });
  }));

  router.delete('/education/:id', asyncHandler(async (req, res) => {
    await candidateService.deleteEducation(userId(req), req.params.id!);
    res.status(204).end();
  }));

  router.get('/certificates', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.listCertificates(userId(req)) });
  }));

  router.post('/certificates', asyncHandler(async (req, res) => {
    res.status(201).json({ data: await candidateService.createCertificate(userId(req), req.body) });
  }));

  router.put('/certificates/:id', asyncHandler(async (req, res) => {
    res.json({ data: await candidateService.updateCertificate(userId(req), req.params.id!, req.body) });
  }));

  router.delete('/certificates/:id', asyncHandler(async (req, res) => {
    await candidateService.deleteCertificate(userId(req), req.params.id!);
    res.status(204).end();
  }));

  return router;
}
