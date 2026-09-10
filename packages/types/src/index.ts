export type Locale = 'en' | 'ar';

export type CandidateAvailability = 'open' | 'paused' | 'hidden';
export type CandidateVideoStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'failed';
export type MeetingType = 'google_meet' | 'video_call' | 'in_person';
export type InterviewStatus = 'pending' | 'accepted' | 'suggested_time' | 'declined' | 'cancelled';

export type UserKind = 'candidate' | 'company_member' | 'super_admin';
export type AccountStatus = 'active' | 'suspended' | 'disabled';
export type CompanyMemberRole = 'company_owner' | 'company_admin' | 'recruiter';
export type EffectiveRole = 'super_admin' | 'company_owner' | 'company_admin' | 'recruiter' | 'candidate';
export type SessionClientType = 'web' | 'mobile';

export interface AuthenticatedPrincipal {
  userId: string;
  email: string;
  kind: UserKind;
  effectiveRole: EffectiveRole;
  companyId: string | null;
  companyMemberId: string | null;
  sessionId: string;
  clientType: SessionClientType;
}

export interface CandidatePreview {
  id: string;
  displayName: string;
  headline: string;
  country: string;
  city: string;
  yearsExperience: number;
  skills: string[];
  preferredRoles: string[];
  videoStatus: CandidateVideoStatus;
}

export interface HealthResponse {
  status: 'ok';
  service: 'cvideo-api';
  version: 'v1';
}
