export type Locale = 'en' | 'ar';

export type CandidateAvailability = 'open' | 'paused' | 'hidden';
export type CandidateVideoStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'failed';
export type MeetingType = 'google_meet' | 'video_call' | 'in_person';
export type InterviewStatus = 'pending' | 'accepted' | 'suggested_time' | 'declined' | 'cancelled';

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
