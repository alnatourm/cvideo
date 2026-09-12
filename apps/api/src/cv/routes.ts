import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireCompanyTenant, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { CvDownload, CvService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { void handler(req as AuthenticatedRequest, res).catch(next); };
}

function contentLength(req: AuthenticatedRequest) {
  const raw = req.header('content-length');
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

async function sendDownload(res: Response, document: CvDownload) {
  const fallback = document.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('content-type', 'application/pdf');
  res.setHeader('content-length', String(document.sizeBytes));
  res.setHeader('content-disposition', `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(document.filename)}`);
  await pipeline(Readable.from(document.body), res);
}

export function createCandidateCvRouter(authService: AuthService, cvService: CvService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('candidate'));
  router.get('/cv', asyncHandler(async (req, res) => {
    res.json({ data: await cvService.getOwn(req.security!.principal.userId) });
  }));
  router.put('/cv/content', asyncHandler(async (req, res) => {
    const data = await cvService.uploadOwn(
      req.security!.principal.userId,
      req.header('x-file-name') ?? undefined,
      req.header('content-type') ?? undefined,
      contentLength(req),
      req,
    );
    res.status(201).json({ data });
  }));
  router.get('/cv/content', asyncHandler(async (req, res) => {
    await sendDownload(res, await cvService.downloadOwn(req.security!.principal.userId));
  }));
  router.delete('/cv', asyncHandler(async (req, res) => {
    await cvService.deleteOwn(req.security!.principal.userId);
    res.status(204).end();
  }));
  return router;
}

export function createRecruiterCvRouter(authService: AuthService, cvService: CvService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('company_owner', 'company_admin', 'recruiter'), requireCompanyTenant());
  router.get('/:candidateId/cv', asyncHandler(async (req, res) => {
    await sendDownload(res, await cvService.downloadForRecruiter(String(req.params.candidateId)));
  }));
  return router;
}
