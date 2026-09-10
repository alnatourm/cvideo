import type { AuthenticatedPrincipal, CompanyMemberRole, EffectiveRole } from '@cvideo/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthService } from './service.js';
import { AuthError } from './errors.js';

export const SESSION_COOKIE = 'cvideo_session';

export interface SecurityContext {
  principal: AuthenticatedPrincipal;
  rawSessionToken: string;
  transport: 'cookie' | 'bearer';
}

export interface AuthenticatedRequest extends Request {
  security?: SecurityContext;
}

function readSessionToken(req: Request): { token: string; transport: 'cookie' | 'bearer' } | null {
  const cookieToken = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (cookieToken) return { token: cookieToken, transport: 'cookie' };

  const authorization = req.header('authorization');
  if (!authorization) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match?.[1]) return null;
  return { token: match[1], transport: 'bearer' };
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function transportMatchesSession(clientType: 'web' | 'mobile', transport: 'cookie' | 'bearer') {
  return (clientType === 'web' && transport === 'cookie') || (clientType === 'mobile' && transport === 'bearer');
}

export function authenticate(authService: AuthService): RequestHandler {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const credential = readSessionToken(req);
      if (!credential) throw new AuthError('UNAUTHENTICATED', 401, 'Authentication required');

      const session = await authService.authenticateSession(credential.token);
      if (!transportMatchesSession(session.principal.clientType, credential.transport)) {
        throw new AuthError('UNAUTHENTICATED', 401, 'Authentication required');
      }

      if (credential.transport === 'cookie' && isUnsafeMethod(req.method)) {
        authService.verifyCsrf(session, req.header('x-csrf-token') ?? undefined);
      }

      req.security = {
        principal: session.principal,
        rawSessionToken: credential.token,
        transport: credential.transport,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRoles(...allowedRoles: EffectiveRole[]): RequestHandler {
  const allowed = new Set(allowedRoles);
  return (req: AuthenticatedRequest, _res, next) => {
    const principal = req.security?.principal;
    if (!principal) return next(new AuthError('UNAUTHENTICATED', 401, 'Authentication required'));
    if (!allowed.has(principal.effectiveRole)) {
      return next(new AuthError('FORBIDDEN', 403, 'Insufficient permissions'));
    }
    return next();
  };
}

export function requireCompanyTenant(): RequestHandler {
  return (req: AuthenticatedRequest, _res, next) => {
    const principal = req.security?.principal;
    if (!principal) return next(new AuthError('UNAUTHENTICATED', 401, 'Authentication required'));
    if (!principal.companyId || !['company_owner', 'company_admin', 'recruiter'].includes(principal.effectiveRole)) {
      return next(new AuthError('FORBIDDEN', 403, 'Company tenant membership required'));
    }
    return next();
  };
}

export function requireTenantIdParam(paramName = 'companyId'): RequestHandler {
  return (req: AuthenticatedRequest, _res, next) => {
    const principal = req.security?.principal;
    if (!principal) return next(new AuthError('UNAUTHENTICATED', 401, 'Authentication required'));
    if (principal.effectiveRole === 'super_admin') return next();
    if (!principal.companyId || req.params[paramName] !== principal.companyId) {
      return next(new AuthError('FORBIDDEN', 403, 'Cross-tenant access denied'));
    }
    return next();
  };
}

const assignableRoles: Record<CompanyMemberRole, ReadonlySet<CompanyMemberRole>> = {
  company_owner: new Set(['company_admin', 'recruiter']),
  company_admin: new Set(['recruiter']),
  recruiter: new Set(),
};

export function canAssignCompanyRole(actor: EffectiveRole, target: CompanyMemberRole): boolean {
  if (actor === 'super_admin') return true;
  if (actor !== 'company_owner' && actor !== 'company_admin' && actor !== 'recruiter') return false;
  return assignableRoles[actor].has(target);
}
