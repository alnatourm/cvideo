import type { EffectiveRole } from '@cvideo/types';
import { z } from 'zod';
import { canAssignCompanyRole } from '../auth/middleware.js';
import { CompanyError } from './errors.js';
import type { CompanyMemberRecord, CompanyRepository } from './repository.js';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(1).max(120),
  industry: z.string().trim().max(160).optional().nullable(),
  companySize: z.string().trim().max(80).optional().nullable(),
  website: z.string().trim().url().max(2048).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
});
const memberIdSchema = z.string().uuid();
const memberUpdateSchema = z.object({
  role: z.enum(['company_admin', 'recruiter']),
  status: z.enum(['active', 'suspended']),
});

function presentMember(member: CompanyMemberRecord) {
  return { ...member, createdAt: member.createdAt.toISOString() };
}

export class CompanyService {
  constructor(private readonly repository: CompanyRepository) {}

  async getProfile(companyId: string) {
    const company = await this.repository.getProfile(companyId);
    if (!company) throw new CompanyError('COMPANY_NOT_FOUND', 404, 'Company not found');
    return company;
  }

  async updateProfile(companyId: string, actorUserId: string, input: unknown) {
    const value = profileSchema.parse(input);
    const company = await this.repository.updateProfile(companyId, actorUserId, {
      ...value,
      industry: value.industry || null,
      companySize: value.companySize || null,
      website: value.website || null,
      description: value.description || null,
    });
    if (!company) throw new CompanyError('COMPANY_NOT_FOUND', 404, 'Company not found');
    return company;
  }

  async listMembers(companyId: string) {
    return (await this.repository.listMembers(companyId)).map(presentMember);
  }

  async updateMember(companyId: string, actorMemberId: string, actorUserId: string, actorRole: EffectiveRole, memberId: unknown, input: unknown) {
    const id = memberIdSchema.parse(memberId);
    const value = memberUpdateSchema.parse(input);
    const target = await this.repository.getMember(companyId, id);
    if (!target) throw new CompanyError('MEMBER_NOT_FOUND', 404, 'Company member not found');
    if (target.id === actorMemberId || target.role === 'company_owner' || !canAssignCompanyRole(actorRole, target.role) || !canAssignCompanyRole(actorRole, value.role)) {
      throw new CompanyError('MEMBER_CHANGE_FORBIDDEN', 403, 'You cannot change this company member');
    }
    const updated = await this.repository.updateMember(companyId, id, actorUserId, value);
    if (!updated) throw new CompanyError('MEMBER_NOT_FOUND', 404, 'Company member not found');
    return presentMember(updated);
  }
}
