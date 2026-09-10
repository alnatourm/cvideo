import { Router, type RequestHandler, type Response } from 'express';
import type { TaxonomyService } from './service.js';

function asyncHandler(handler: (req: any, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

function single(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' ? value : undefined;
}

export function createTaxonomyRouter(service: TaxonomyService) {
  const router = Router();

  router.get('/categories', asyncHandler(async (_req, res) => {
    res.json({ data: await service.listCategories() });
  }));

  router.get('/categories/:id/subcategories', asyncHandler(async (req, res) => {
    res.json({ data: await service.listSubcategories(single(req.params.id)) });
  }));

  router.get('/job-titles', asyncHandler(async (req, res) => {
    res.json({ data: await service.listJobTitles({ q: single(req.query.q), limit: single(req.query.limit) }) });
  }));

  router.get('/skills', asyncHandler(async (req, res) => {
    res.json({ data: await service.listSkills({ q: single(req.query.q), limit: single(req.query.limit) }) });
  }));

  router.get('/languages', asyncHandler(async (_req, res) => {
    res.json({ data: await service.listLanguages() });
  }));

  return router;
}
