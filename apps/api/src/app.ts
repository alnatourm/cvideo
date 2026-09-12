import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { AdminError } from './admin/errors.js';
import { createAdminRouter, createCompanyVerificationRouter } from './admin/routes.js';
import type { CompanyVerificationService } from './admin/service.js';
import { AuthError } from './auth/errors.js';
import { createAuthRouter } from './auth/routes.js';
import type { AuthService } from './auth/service.js';
import { CandidateError } from './candidate/errors.js';
import { createCandidateRouter } from './candidate/routes.js';
import type { CandidateService } from './candidate/service.js';
import { CompanyError } from './company/errors.js';
import { createCompanyMembersRouter, createCompanyProfileRouter } from './company/routes.js';
import type { CompanyService } from './company/service.js';
import { CvError } from './cv/errors.js';
import { createCandidateCvRouter, createRecruiterCvRouter } from './cv/routes.js';
import type { CvService } from './cv/service.js';
import { DiscoveryError } from './discovery/errors.js';
import { createCandidateDiscoveryRouter, createRecruiterDiscoveryRouter } from './discovery/routes.js';
import type { DiscoveryService } from './discovery/service.js';
import { InterviewsError } from './interviews/errors.js';
import { createInterviewsRouter } from './interviews/routes.js';
import type { InterviewsService } from './interviews/service.js';
import { MediaError } from './media/errors.js';
import { createMediaRouter } from './media/routes.js';
import type { MediaService } from './media/service.js';
import { MessagingError } from './messaging/errors.js';
import { createMessagingRouter } from './messaging/routes.js';
import type { MessagingService } from './messaging/service.js';
import { SavedListsError } from './saved-lists/errors.js';
import { createSavedListsRouter } from './saved-lists/routes.js';
import type { SavedListsService } from './saved-lists/service.js';
import { createTaxonomyRouter } from './taxonomy/routes.js';
import type { TaxonomyService } from './taxonomy/service.js';

export interface AppOptions {
  companyVerificationService?: CompanyVerificationService;
  companyService?: CompanyService;
  authService?: AuthService;
  candidateService?: CandidateService;
  cvService?: CvService;
  discoveryService?: DiscoveryService;
  interviewsService?: InterviewsService;
  mediaService?: MediaService;
  messagingService?: MessagingService;
  savedListsService?: SavedListsService;
  taxonomyService?: TaxonomyService;
  secureCookies?: boolean;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'cvideo-api', version: 'v1' });
  });

  if (options.taxonomyService) app.use('/api/v1/taxonomy', createTaxonomyRouter(options.taxonomyService));
  if (options.authService) app.use('/api/v1/auth', createAuthRouter(options.authService, { secureCookies: options.secureCookies }));
  if (options.authService && options.companyVerificationService) {
    app.use('/api/v1/admin', createAdminRouter(options.authService, options.companyVerificationService));
    app.use('/api/v1/companies', createCompanyVerificationRouter(options.authService, options.companyVerificationService));
  }
  if (options.authService && options.companyService) {
    app.use('/api/v1/companies', createCompanyProfileRouter(options.authService, options.companyService));
    app.use('/api/v1/company/members', createCompanyMembersRouter(options.authService, options.companyService));
  }
  if (options.authService && options.candidateService) {
    app.use('/api/v1/candidate', createCandidateRouter(options.authService, options.candidateService));
  }
  if (options.authService && options.cvService) {
    app.use('/api/v1/candidate', createCandidateCvRouter(options.authService, options.cvService));
    app.use('/api/v1/search/candidates', createRecruiterCvRouter(options.authService, options.cvService));
  }
  if (options.authService && options.discoveryService) {
    app.use('/api/v1/candidate', createCandidateDiscoveryRouter(options.authService, options.discoveryService));
    app.use('/api/v1/search/candidates', createRecruiterDiscoveryRouter(options.authService, options.discoveryService));
  }
  if (options.authService && options.mediaService) {
    app.use('/api/v1/candidate', createMediaRouter(options.authService, options.mediaService));
  }
  if (options.authService && options.savedListsService) {
    app.use('/api/v1/saved-lists', createSavedListsRouter(options.authService, options.savedListsService));
  }
  if (options.authService && options.messagingService) {
    app.use('/api/v1/conversations', createMessagingRouter(options.authService, options.messagingService));
  }
  if (options.authService && options.interviewsService) {
    app.use('/api/v1/interviews', createInterviewsRouter(options.authService, options.interviewsService));
  }

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found', details: {} } });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (
      error instanceof AdminError ||
      error instanceof AuthError ||
      error instanceof CandidateError ||
      error instanceof CompanyError ||
      error instanceof CvError ||
      error instanceof DiscoveryError ||
      error instanceof InterviewsError ||
      error instanceof MediaError ||
      error instanceof MessagingError ||
      error instanceof SavedListsError
    ) {
      res.status(error.status).json({ error: { code: error.code, message: error.message, details: {} } });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { issues: error.issues.map((issue) => ({ path: issue.path, message: issue.message })) },
        },
      });
      return;
    }

    console.error(JSON.stringify({ level: 'error', service: 'cvideo-api', message: 'unhandled_error' }));
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} } });
  };

  app.use(errorHandler);
  return app;
}
