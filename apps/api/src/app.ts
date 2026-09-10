import cookieParser from 'cookie-parser';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { AuthError } from './auth/errors.js';
import { createAuthRouter } from './auth/routes.js';
import type { AuthService } from './auth/service.js';

export interface AppOptions {
  authService?: AuthService;
  secureCookies?: boolean;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/v1/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cvideo-api',
      version: 'v1',
    });
  });

  if (options.authService) {
    app.use('/api/v1/auth', createAuthRouter(options.authService, { secureCookies: options.secureCookies }));
  }

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        details: {},
      },
    });
  });

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof AuthError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message, details: {} },
      });
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
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} },
    });
  };

  app.use(errorHandler);

  return app;
}
