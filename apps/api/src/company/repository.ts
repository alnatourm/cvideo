import type { CompanyMemberRole } from '@cvideo/types';

export interface CompanyProfileRecord {
  id: string;
  name: string;
  countryCode: string;
  city: string;
  commercialRegistrationNumber: string;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  description: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  operationalStatus: 'active' | 'suspended';
}

export interface CompanyMemberRecord {
  id: string;
  email: string;
  role: CompanyMemberRole;
  status: 'active' | 'suspended';
  createdAt: Date;
}

export interface CompanyProfileUpdate {
  name: string;
  city: string;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  description: string | null;
}

export interface CompanyRepository {
  getProfile(companyId: string): Promise<CompanyProfileRecord | null>;
  updateProfile(companyId: string, actorUserId: string, input: CompanyProfileUpdate): Promise<CompanyProfileRecord | null>;
  listMembers(companyId: string): Promise<CompanyMemberRecord[]>;
  getMember(companyId: string, memberId: string): Promise<CompanyMemberRecord | null>;
  updateMember(companyId: string, memberId: string, actorUserId: string, input: { role: CompanyMemberRole; status: 'active' | 'suspended' }): Promise<CompanyMemberRecord | null>;
}
