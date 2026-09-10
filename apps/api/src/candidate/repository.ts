export interface CandidateProfileUpdate {
  displayName: string;
  headline?: string | null;
  countryCode: string;
  city: string;
  primaryCategoryId?: string | null;
  primarySubcategoryId?: string | null;
  extraSubfieldIds: string[];
  preferredRoleIds: string[];
  skillIds: string[];
  languageIds: string[];
  yearsExperience: number;
  professionalSummary?: string | null;
}

export interface CandidateExperienceInput {
  companyName: string;
  jobTitle: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
}

export interface CandidateEducationInput {
  institution: string;
  qualification: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

export interface CandidateCertificateInput {
  name: string;
  issuingOrganization: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
}

export interface CandidateExperienceRecord extends CandidateExperienceInput {
  id: string;
}

export interface CandidateEducationRecord extends CandidateEducationInput {
  id: string;
}

export interface CandidateCertificateRecord extends CandidateCertificateInput {
  id: string;
}

export interface CandidateVideoRecord {
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'failed';
  durationSeconds: number | null;
  height: number | null;
  mimeType: string | null;
}

export interface CandidateOwnProfile {
  id: string;
  displayName: string;
  headline: string | null;
  profilePhotoUrl: string | null;
  countryCode: string;
  city: string;
  primaryCategoryId: string | null;
  primarySubcategoryId: string | null;
  yearsExperience: number;
  professionalSummary: string | null;
  cvOriginalFilename: string | null;
  extraSubfieldIds: string[];
  preferredRoleIds: string[];
  skillIds: string[];
  languageIds: string[];
  experience: CandidateExperienceRecord[];
  education: CandidateEducationRecord[];
  certificates: CandidateCertificateRecord[];
  video: CandidateVideoRecord | null;
}

export interface CandidateRepository {
  getOwnProfile(userId: string): Promise<CandidateOwnProfile | null>;
  updateOwnProfile(userId: string, input: CandidateProfileUpdate): Promise<CandidateOwnProfile | null>;
  listExperience(userId: string): Promise<CandidateExperienceRecord[]>;
  createExperience(userId: string, input: CandidateExperienceInput): Promise<CandidateExperienceRecord | null>;
  updateExperience(userId: string, id: string, input: CandidateExperienceInput): Promise<CandidateExperienceRecord | null>;
  deleteExperience(userId: string, id: string): Promise<boolean>;
  listEducation(userId: string): Promise<CandidateEducationRecord[]>;
  createEducation(userId: string, input: CandidateEducationInput): Promise<CandidateEducationRecord | null>;
  updateEducation(userId: string, id: string, input: CandidateEducationInput): Promise<CandidateEducationRecord | null>;
  deleteEducation(userId: string, id: string): Promise<boolean>;
  listCertificates(userId: string): Promise<CandidateCertificateRecord[]>;
  createCertificate(userId: string, input: CandidateCertificateInput): Promise<CandidateCertificateRecord | null>;
  updateCertificate(userId: string, id: string, input: CandidateCertificateInput): Promise<CandidateCertificateRecord | null>;
  deleteCertificate(userId: string, id: string): Promise<boolean>;
}
