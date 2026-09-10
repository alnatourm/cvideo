export interface CandidateDiscoveryReadiness {
  candidateId: string;
  hasReadyVideo: boolean;
  hasCategory: boolean;
  hasPreferredRole: boolean;
  hasSkill: boolean;
}

export interface RecruiterCandidateCard {
  id: string;
  displayName: string;
  headline: string | null;
  countryCode: string;
  city: string;
  yearsExperience: number;
  primaryCategoryId: string | null;
  primarySubcategoryId: string | null;
  introductionVideoId: string;
}

export interface RecruiterCandidateDetail extends RecruiterCandidateCard {
  professionalSummary: string | null;
  preferredRoleIds: string[];
  skillIds: string[];
  languageIds: string[];
  certificates: Array<{
    id: string;
    name: string;
    issuingOrganization: string;
    issueDate: string | null;
    expiryDate: string | null;
    credentialUrl: string | null;
  }>;
  experience: Array<{
    id: string;
    companyName: string;
    jobTitle: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string | null;
  }>;
  education: Array<{
    id: string;
    institution: string;
    qualification: string;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
  }>;
}

export interface RecruiterSearchFilters {
  countryCode?: string;
  city?: string;
  categoryId?: string;
  subcategoryId?: string;
  preferredRoleId?: string;
  skillId?: string;
  languageId?: string;
  minExperienceYears?: number;
  cursor?: string;
  pageSize: number;
}

export interface RecruiterSearchPage {
  items: RecruiterCandidateCard[];
  nextCursor: string | null;
}

export interface DiscoveryRepository {
  getReadinessByUserId(userId: string): Promise<CandidateDiscoveryReadiness | null>;
  getVisibilityByUserId(userId: string): Promise<boolean | null>;
  setVisibilityByUserId(userId: string, discoverable: boolean): Promise<boolean | null>;
  searchCandidates(filters: RecruiterSearchFilters): Promise<RecruiterSearchPage>;
  getCandidateDetail(candidateId: string): Promise<RecruiterCandidateDetail | null>;
}
