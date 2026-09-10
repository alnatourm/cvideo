import type {
  AuthenticatedPrincipal,
  CompanyMemberRole,
  EffectiveRole,
} from '@cvideo/types';
import {
  candidateRegistrationInputSchema,
  companyRegistrationInputSchema,
  loginInputSchema,
} from '@cvideo/validation';
import { createOpaqueToken, hashOpaqueToken, hashPassword, safeTokenMatches, verifyPassword } from './crypto.js';
import { AuthError } from './errors.js';
import type { AuthRepository, StoredUser } from './repository.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface IssuedSession {
  principal: AuthenticatedPrincipal;
  sessionToken: string;
  csrfToken: string | null;
  expiresAt: Date;
}

export interface AuthenticatedSession {
  principal: AuthenticatedPrincipal;
  csrfHash: string | null;
  tokenHash: string;
}

function roleForUser(user: StoredUser, membershipRole: CompanyMemberRole | null): EffectiveRole {
  if (user.kind === 'candidate') return 'candidate';
  if (user.kind === 'super_admin') return 'super_admin';
  if (membershipRole) return membershipRole;
  throw new AuthError('FORBIDDEN', 403, 'Company membership is required');
}

export class AuthService {
  private readonly dummyPasswordHashPromise = hashPassword(createOpaqueToken());

  constructor(
    private readonly repository: AuthRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async registerCandidate(input: unknown) {
    const value = candidateRegistrationInputSchema.parse(input);
    if (await this.repository.findUserByEmail(value.email)) {
      throw new AuthError('EMAIL_IN_USE', 409, 'An account already exists for this email');
    }

    const passwordHash = await hashPassword(value.password);
    const user = await this.repository.createCandidateAccount({
      email: value.email,
      passwordHash,
      displayName: value.displayName,
      countryCode: value.countryCode,
      city: value.city,
    });

    return { userId: user.id, email: user.email, role: 'candidate' as const };
  }

  async registerCompany(input: unknown) {
    const value = companyRegistrationInputSchema.parse(input);
    if (await this.repository.findUserByEmail(value.email)) {
      throw new AuthError('EMAIL_IN_USE', 409, 'An account already exists for this email');
    }

    const passwordHash = await hashPassword(value.password);
    const record = await this.repository.createCompanyOwnerAccount({
      email: value.email,
      passwordHash,
      companyName: value.companyName,
      countryCode: value.countryCode,
      city: value.city,
      commercialRegistrationNumber: value.commercialRegistrationNumber,
    });

    return {
      userId: record.user.id,
      email: record.user.email,
      companyId: record.companyId,
      companyMemberId: record.memberId,
      role: 'company_owner' as const,
      verificationStatus: 'pending' as const,
    };
  }

  async login(input: unknown): Promise<IssuedSession> {
    const value = loginInputSchema.parse(input);
    const user = await this.repository.findUserByEmail(value.email);
    const passwordHash = user?.passwordHash ?? (await this.dummyPasswordHashPromise);
    const passwordMatches = await verifyPassword(passwordHash, value.password);

    if (!user || !passwordMatches) {
      throw new AuthError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new AuthError('ACCOUNT_INACTIVE', 403, 'Account is not active');
    }

    const membership =
      user.kind === 'company_member' ? await this.repository.findActiveMembershipByUserId(user.id) : null;

    if (user.kind === 'company_member' && !membership) {
      throw new AuthError('FORBIDDEN', 403, 'Active company membership is required');
    }

    const sessionToken = createOpaqueToken();
    const csrfToken = value.clientType === 'web' ? createOpaqueToken() : null;
    const tokenHash = hashOpaqueToken(sessionToken);
    const csrfHash = csrfToken ? hashOpaqueToken(csrfToken) : null;
    const expiresAt = new Date(this.now().getTime() + SESSION_TTL_MS);

    const session = await this.repository.createSession({
      userId: user.id,
      tokenHash,
      csrfHash,
      clientType: value.clientType,
      expiresAt,
    });

    return {
      sessionToken,
      csrfToken,
      expiresAt,
      principal: {
        userId: user.id,
        email: user.email,
        kind: user.kind,
        effectiveRole: roleForUser(user, membership?.role ?? null),
        companyId: membership?.companyId ?? null,
        companyMemberId: membership?.id ?? null,
        sessionId: session.id,
        clientType: value.clientType,
      },
    };
  }

  async authenticateSession(rawToken: string): Promise<AuthenticatedSession> {
    if (!rawToken || rawToken.length > 256) {
      throw new AuthError('UNAUTHENTICATED', 401, 'Authentication required');
    }

    const tokenHash = hashOpaqueToken(rawToken);
    const session = await this.repository.findSessionByTokenHash(tokenHash);
    const now = this.now();

    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw new AuthError('UNAUTHENTICATED', 401, 'Authentication required');
    }

    const user = await this.repository.findUserById(session.userId);
    if (!user || user.status !== 'active') {
      throw new AuthError('UNAUTHENTICATED', 401, 'Authentication required');
    }

    const membership =
      user.kind === 'company_member' ? await this.repository.findActiveMembershipByUserId(user.id) : null;
    if (user.kind === 'company_member' && !membership) {
      throw new AuthError('FORBIDDEN', 403, 'Active company membership is required');
    }

    await this.repository.touchSession(session.id, now);

    return {
      tokenHash,
      csrfHash: session.csrfHash,
      principal: {
        userId: user.id,
        email: user.email,
        kind: user.kind,
        effectiveRole: roleForUser(user, membership?.role ?? null),
        companyId: membership?.companyId ?? null,
        companyMemberId: membership?.id ?? null,
        sessionId: session.id,
        clientType: session.clientType,
      },
    };
  }

  verifyCsrf(session: AuthenticatedSession, rawCsrfToken: string | undefined): void {
    if (session.principal.clientType !== 'web') return;
    if (!rawCsrfToken || !session.csrfHash || !safeTokenMatches(rawCsrfToken, session.csrfHash)) {
      throw new AuthError('CSRF_INVALID', 403, 'CSRF validation failed');
    }
  }

  async logout(rawToken: string): Promise<void> {
    if (!rawToken || rawToken.length > 256) return;
    await this.repository.revokeSessionByTokenHash(hashOpaqueToken(rawToken));
  }
}
