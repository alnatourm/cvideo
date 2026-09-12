import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { auditEvents, companies, companyMembers, companyVerifications, users } from '../db/security-schema.js';
import type {
  CompanyOperationalStatus,
  CompanyVerificationDecision,
  CompanyVerificationItem,
  CompanyVerificationRepository,
  CompanyVerificationStatus,
} from './repository.js';

const verificationSelection = {
  id: companyVerifications.id,
  companyId: companies.id,
  companyName: companies.name,
  countryCode: companies.countryCode,
  city: companies.city,
  commercialRegistrationNumber: companyVerifications.commercialRegistrationNumber,
  submittedByEmail: users.email,
  verificationStatus: companyVerifications.status,
  operationalStatus: companies.operationalStatus,
  reviewedAt: companyVerifications.reviewedAt,
  rejectionReason: companyVerifications.rejectionReason,
  reviewNote: companyVerifications.reviewNote,
  createdAt: companyVerifications.createdAt,
};

export class DrizzleCompanyVerificationRepository implements CompanyVerificationRepository {
  constructor(private readonly db: Database) {}

  private query() {
    return this.db
      .select(verificationSelection)
      .from(companyVerifications)
      .innerJoin(companies, eq(companies.id, companyVerifications.companyId))
      .innerJoin(users, eq(users.id, companyVerifications.submittedByUserId));
  }

  private async getById(verificationId: string) {
    const [row] = await this.query().where(eq(companyVerifications.id, verificationId)).limit(1);
    return row ?? null;
  }

  private async getLatestByCompanyId(companyId: string) {
    const [row] = await this.query().where(eq(companies.id, companyId)).orderBy(desc(companyVerifications.createdAt)).limit(1);
    return row ?? null;
  }

  async listVerifications(status?: CompanyVerificationStatus): Promise<CompanyVerificationItem[]> {
    const query = this.query();
    return status
      ? query.where(eq(companyVerifications.status, status)).orderBy(desc(companyVerifications.createdAt)).limit(100)
      : query.orderBy(desc(companyVerifications.createdAt)).limit(100);
  }

  async getCompanyStatusByUserId(userId: string): Promise<CompanyVerificationItem | null> {
    const [row] = await this.query()
      .innerJoin(companyMembers, eq(companyMembers.companyId, companies.id))
      .where(eq(companyMembers.userId, userId))
      .orderBy(desc(companyVerifications.createdAt))
      .limit(1);
    return row ?? null;
  }

  async decideVerification(input: CompanyVerificationDecision): Promise<CompanyVerificationItem | null> {
    const companyId = await this.db.transaction(async (tx) => {
      const [reviewed] = await tx
        .update(companyVerifications)
        .set({
          status: input.status,
          reviewedByAdminUserId: input.adminUserId,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason,
          reviewNote: input.reviewNote,
          updatedAt: new Date(),
        })
        .where(and(eq(companyVerifications.id, input.verificationId), eq(companyVerifications.status, 'pending')))
        .returning({ companyId: companyVerifications.companyId });
      if (!reviewed) return null;

      await tx.update(companies).set({ verificationStatus: input.status, updatedAt: new Date() }).where(eq(companies.id, reviewed.companyId));
      await tx.insert(auditEvents).values({
        actorUserId: input.adminUserId,
        action: input.status === 'verified' ? 'company_verification.approved' : 'company_verification.rejected',
        targetType: 'company_verification',
        targetId: input.verificationId,
        metadata: { companyId: reviewed.companyId, reason: input.rejectionReason, note: input.reviewNote },
      });
      return reviewed.companyId;
    });
    if (!companyId) return null;
    return this.getById(input.verificationId);
  }

  async setCompanyOperationalStatus(companyId: string, status: CompanyOperationalStatus, adminUserId: string): Promise<CompanyVerificationItem | null> {
    const changed = await this.db.transaction(async (tx) => {
      const [company] = await tx.update(companies).set({ operationalStatus: status, updatedAt: new Date() }).where(eq(companies.id, companyId)).returning({ id: companies.id });
      if (!company) return false;
      await tx.insert(auditEvents).values({ actorUserId: adminUserId, action: `company.${status}`, targetType: 'company', targetId: companyId, metadata: {} });
      return true;
    });
    if (!changed) return null;
    return this.getLatestByCompanyId(companyId);
  }
}
