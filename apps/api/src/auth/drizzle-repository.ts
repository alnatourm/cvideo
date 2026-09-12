import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { candidateProfiles } from '../db/schema.js';
import { companies, companyMembers, companyVerifications, sessions, users } from '../db/security-schema.js';
import type {
  AuthRepository,
  CandidateRegistrationRecord,
  CompanyRegistrationRecord,
  StoredCompanyMembership,
  StoredSession,
  StoredUser,
} from './repository.js';

function mapUser(row: typeof users.$inferSelect): StoredUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    kind: row.kind,
    status: row.status,
  };
}

function mapMembership(row: typeof companyMembers.$inferSelect): StoredCompanyMembership {
  return {
    id: row.id,
    companyId: row.companyId,
    userId: row.userId,
    role: row.role,
    status: row.status,
  };
}

function mapSession(row: typeof sessions.$inferSelect): StoredSession {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    csrfHash: row.csrfHash,
    clientType: row.clientType,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
  };
}

export class DrizzleAuthRepository implements AuthRepository {
  constructor(private readonly db: Database) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ? mapUser(row) : null;
  }

  async findUserById(userId: string): Promise<StoredUser | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return row ? mapUser(row) : null;
  }

  async createCandidateAccount(input: CandidateRegistrationRecord): Promise<StoredUser> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          kind: 'candidate',
        })
        .returning();

      if (!user) throw new Error('Failed to create candidate user');

      await tx.insert(candidateProfiles).values({
        userId: user.id,
        displayName: input.displayName,
        countryCode: input.countryCode,
        city: input.city,
        yearsExperience: 0,
      });

      return mapUser(user);
    });
  }

  async createCompanyOwnerAccount(input: CompanyRegistrationRecord) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          kind: 'company_member',
        })
        .returning();
      if (!user) throw new Error('Failed to create company user');

      const [company] = await tx
        .insert(companies)
        .values({
          name: input.companyName,
          countryCode: input.countryCode,
          city: input.city,
          commercialRegistrationNumber: input.commercialRegistrationNumber,
          verificationStatus: 'pending',
        })
        .returning();
      if (!company) throw new Error('Failed to create company');

      const [membership] = await tx
        .insert(companyMembers)
        .values({
          companyId: company.id,
          userId: user.id,
          role: 'company_owner',
        })
        .returning();
      if (!membership) throw new Error('Failed to create company owner membership');

      await tx.insert(companyVerifications).values({
        companyId: company.id,
        submittedByUserId: user.id,
        status: 'pending',
        commercialRegistrationNumber: company.commercialRegistrationNumber,
      });

      return {
        user: mapUser(user),
        companyId: company.id,
        memberId: membership.id,
      };
    });
  }

  async findActiveMembershipByUserId(userId: string): Promise<StoredCompanyMembership | null> {
    const [row] = await this.db
      .select({
        id: companyMembers.id,
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
        role: companyMembers.role,
        status: companyMembers.status,
        createdAt: companyMembers.createdAt,
        updatedAt: companyMembers.updatedAt,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(and(eq(companyMembers.userId, userId), eq(companyMembers.status, 'active'), eq(companies.operationalStatus, 'active')))
      .limit(1);
    return row ? mapMembership(row) : null;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    csrfHash: string | null;
    clientType: 'web' | 'mobile';
    expiresAt: Date;
  }): Promise<StoredSession> {
    const [row] = await this.db
      .insert(sessions)
      .values(input)
      .returning();
    if (!row) throw new Error('Failed to create session');
    return mapSession(row);
  }

  async findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
      .limit(1);
    return row ? mapSession(row) : null;
  }

  async revokeSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
  }

  async touchSession(sessionId: string, at: Date): Promise<void> {
    await this.db.update(sessions).set({ lastSeenAt: at }).where(eq(sessions.id, sessionId));
  }
}
