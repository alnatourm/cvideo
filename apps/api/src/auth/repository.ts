import type {
  AccountStatus,
  CompanyMemberRole,
  SessionClientType,
  UserKind,
} from '@cvideo/types';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  kind: UserKind;
  status: AccountStatus;
}

export interface StoredCompanyMembership {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyMemberRole;
  status: 'active' | 'suspended';
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  csrfHash: string | null;
  clientType: SessionClientType;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CandidateRegistrationRecord {
  email: string;
  passwordHash: string;
  displayName: string;
  countryCode: string;
  city: string;
}

export interface CompanyRegistrationRecord {
  email: string;
  passwordHash: string;
  companyName: string;
  countryCode: string;
  city: string;
  commercialRegistrationNumber: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(userId: string): Promise<StoredUser | null>;
  createCandidateAccount(input: CandidateRegistrationRecord): Promise<StoredUser>;
  createCompanyOwnerAccount(input: CompanyRegistrationRecord): Promise<{
    user: StoredUser;
    companyId: string;
    memberId: string;
  }>;
  findActiveMembershipByUserId(userId: string): Promise<StoredCompanyMembership | null>;
  createSession(input: {
    userId: string;
    tokenHash: string;
    csrfHash: string | null;
    clientType: SessionClientType;
    expiresAt: Date;
  }): Promise<StoredSession>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  revokeSessionByTokenHash(tokenHash: string): Promise<void>;
  touchSession(sessionId: string, at: Date): Promise<void>;
}
