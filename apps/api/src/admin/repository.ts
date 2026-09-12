export type CompanyVerificationStatus = 'pending' | 'verified' | 'rejected';
export type CompanyOperationalStatus = 'active' | 'suspended';

export interface CompanyVerificationItem {
  id: string;
  companyId: string;
  companyName: string;
  countryCode: string;
  city: string;
  commercialRegistrationNumber: string;
  submittedByEmail: string;
  verificationStatus: CompanyVerificationStatus;
  operationalStatus: CompanyOperationalStatus;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  reviewNote: string | null;
  createdAt: Date;
}

export interface CompanyVerificationDecision {
  verificationId: string;
  adminUserId: string;
  status: 'verified' | 'rejected';
  rejectionReason: string | null;
  reviewNote: string | null;
}

export interface CompanyVerificationRepository {
  listVerifications(status?: CompanyVerificationStatus): Promise<CompanyVerificationItem[]>;
  getCompanyStatusByUserId(userId: string): Promise<CompanyVerificationItem | null>;
  decideVerification(input: CompanyVerificationDecision): Promise<CompanyVerificationItem | null>;
  setCompanyOperationalStatus(companyId: string, status: CompanyOperationalStatus, adminUserId: string): Promise<CompanyVerificationItem | null>;
}
