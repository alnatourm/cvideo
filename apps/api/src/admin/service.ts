import { z } from 'zod';
import { AdminError } from './errors.js';
import type { CompanyVerificationRepository } from './repository.js';

const statusFilterSchema = z.enum(['pending', 'verified', 'rejected']).optional();
const idSchema = z.string().uuid();
const approveSchema = z.object({ note: z.string().trim().min(1).max(2000).optional() });
const rejectSchema = z.object({ reason: z.string().trim().min(3).max(2000), note: z.string().trim().min(1).max(2000).optional() });
const operationalStatusSchema = z.object({ status: z.enum(['active', 'suspended']) });

function present(row: Awaited<ReturnType<CompanyVerificationRepository['getCompanyStatusByUserId']>> & {}) {
  return {
    ...row,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function presentCompanyStatus(row: Awaited<ReturnType<CompanyVerificationRepository['getCompanyStatusByUserId']>> & {}) {
  return {
    id: row.id,
    companyId: row.companyId,
    companyName: row.companyName,
    countryCode: row.countryCode,
    city: row.city,
    commercialRegistrationNumber: row.commercialRegistrationNumber,
    verificationStatus: row.verificationStatus,
    operationalStatus: row.operationalStatus,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export class CompanyVerificationService {
  constructor(private readonly repository: CompanyVerificationRepository) {}

  async list(input: unknown) {
    const status = statusFilterSchema.parse(input);
    return (await this.repository.listVerifications(status)).map(present);
  }

  async getOwnStatus(userId: string) {
    const row = await this.repository.getCompanyStatusByUserId(userId);
    if (!row) throw new AdminError('COMPANY_NOT_FOUND', 404, 'Company not found');
    return presentCompanyStatus(row);
  }

  async approve(verificationId: unknown, adminUserId: string, input: unknown) {
    const id = idSchema.parse(verificationId);
    const value = approveSchema.parse(input);
    const row = await this.repository.decideVerification({ verificationId: id, adminUserId, status: 'verified', rejectionReason: null, reviewNote: value.note ?? null });
    if (!row) throw new AdminError('VERIFICATION_ALREADY_REVIEWED', 409, 'Verification was not found or has already been reviewed');
    return present(row);
  }

  async reject(verificationId: unknown, adminUserId: string, input: unknown) {
    const id = idSchema.parse(verificationId);
    const value = rejectSchema.parse(input);
    const row = await this.repository.decideVerification({ verificationId: id, adminUserId, status: 'rejected', rejectionReason: value.reason, reviewNote: value.note ?? null });
    if (!row) throw new AdminError('VERIFICATION_ALREADY_REVIEWED', 409, 'Verification was not found or has already been reviewed');
    return present(row);
  }

  async setOperationalStatus(companyId: unknown, adminUserId: string, input: unknown) {
    const id = idSchema.parse(companyId);
    const value = operationalStatusSchema.parse(input);
    const row = await this.repository.setCompanyOperationalStatus(id, value.status, adminUserId);
    if (!row) throw new AdminError('COMPANY_NOT_FOUND', 404, 'Company not found');
    return present(row);
  }
}
