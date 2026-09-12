import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { auditEvents, companies, companyMembers, users } from '../db/security-schema.js';
import type { CompanyMemberRecord, CompanyProfileRecord, CompanyProfileUpdate, CompanyRepository } from './repository.js';

const profileSelection = {
  id: companies.id,
  name: companies.name,
  countryCode: companies.countryCode,
  city: companies.city,
  commercialRegistrationNumber: companies.commercialRegistrationNumber,
  industry: companies.industry,
  companySize: companies.companySize,
  website: companies.website,
  description: companies.description,
  verificationStatus: companies.verificationStatus,
  operationalStatus: companies.operationalStatus,
};

const memberSelection = {
  id: companyMembers.id,
  email: users.email,
  role: companyMembers.role,
  status: companyMembers.status,
  createdAt: companyMembers.createdAt,
};

export class DrizzleCompanyRepository implements CompanyRepository {
  constructor(private readonly db: Database) {}

  async getProfile(companyId: string): Promise<CompanyProfileRecord | null> {
    const [row] = await this.db.select(profileSelection).from(companies).where(eq(companies.id, companyId)).limit(1);
    return row ?? null;
  }

  async updateProfile(companyId: string, actorUserId: string, input: CompanyProfileUpdate): Promise<CompanyProfileRecord | null> {
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx.update(companies).set({ ...input, updatedAt: new Date() }).where(eq(companies.id, companyId)).returning({ id: companies.id });
      if (!row) return false;
      await tx.insert(auditEvents).values({ actorUserId, action: 'company.profile_updated', targetType: 'company', targetId: companyId, metadata: {} });
      return true;
    });
    return updated ? this.getProfile(companyId) : null;
  }

  async listMembers(companyId: string): Promise<CompanyMemberRecord[]> {
    return this.db.select(memberSelection).from(companyMembers).innerJoin(users, eq(users.id, companyMembers.userId)).where(eq(companyMembers.companyId, companyId)).orderBy(asc(companyMembers.createdAt));
  }

  async getMember(companyId: string, memberId: string): Promise<CompanyMemberRecord | null> {
    const [row] = await this.db.select(memberSelection).from(companyMembers).innerJoin(users, eq(users.id, companyMembers.userId)).where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.id, memberId))).limit(1);
    return row ?? null;
  }

  async updateMember(companyId: string, memberId: string, actorUserId: string, input: { role: CompanyMemberRecord['role']; status: CompanyMemberRecord['status'] }): Promise<CompanyMemberRecord | null> {
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx.update(companyMembers).set({ ...input, updatedAt: new Date() }).where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.id, memberId))).returning({ id: companyMembers.id });
      if (!row) return false;
      await tx.insert(auditEvents).values({ actorUserId, action: 'company.member_updated', targetType: 'company_member', targetId: memberId, metadata: { companyId, role: input.role, status: input.status } });
      return true;
    });
    return updated ? this.getMember(companyId, memberId) : null;
  }
}
