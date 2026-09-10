import { Router, type RequestHandler, type Response } from 'express';
import type { AuthenticatedRequest } from '../auth/middleware.js';
import { authenticate, requireRoles } from '../auth/middleware.js';
import type { AuthService } from '../auth/service.js';
import type { MediaService } from './service.js';

function asyncHandler(handler: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req as AuthenticatedRequest, res).catch(next);
  };
}

function userId(req: AuthenticatedRequest) {
  return req.security!.principal.userId;
}

function contentLength(req: AuthenticatedRequest): number | undefined {
  const raw = req.header('content-length');
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function createMediaRouter(authService: AuthService, mediaService: MediaService) {
  const router = Router();
  router.use(authenticate(authService), requireRoles('candidate'));

  router.get('/video', asyncHandler(async (req, res) => {
    res.json({ data: await mediaService.getOwnVideo(userId(req)) });
  }));

  router.post('/video/start', asyncHandler(async (req, res) => {
    res.status(201).json({ data: await mediaService.startVideo(userId(req), req.body) });
  }));

  router.put('/video/content', asyncHandler(async (req, res) => {
    const result = await mediaService.uploadVideo(
      userId(req),
      req.header('content-type') ?? undefined,
      contentLength(req),
      req,
    );
    res.status(202).json({ data: result });
  }));

  router.post('/video/sync', asyncHandler(async (req, res) => {
    res.json({ data: await mediaService.syncVideo(userId(req)) });
  }));

  router.delete('/video', asyncHandler(async (req, res) => {
    await mediaService.deleteVideo(userId(req));
    res.status(204).end();
  }));

  return router;
}
