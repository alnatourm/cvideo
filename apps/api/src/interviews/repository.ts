import type { InterviewStatus, MeetingType } from '@cvideo/types';

export interface InterviewActor {
  userId: string;
  companyId: string | null;
}

export interface InterviewCreateInput {
  candidateId: string;
  opportunityTitle: string;
  startsAtUtc: Date;
  timezone: string;
  durationMinutes: number;
  meetingType: MeetingType;
  message?: string | null;
  location?: string | null;
}

export interface InterviewRecord {
  id: string;
  companyId: string;
  candidateId: string;
  requestedByUserId: string;
  opportunityTitle: string;
  startsAtUtc: Date;
  timezone: string;
  durationMinutes: number;
  meetingType: MeetingType;
  message: string | null;
  location: string | null;
  status: InterviewStatus;
  suggestedStartsAtUtc: Date | null;
  suggestedTimezone: string | null;
  suggestedMessage: string | null;
  meetingProvider: string | null;
  meetingExternalId: string | null;
  meetingJoinUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateInterviewResult =
  | { kind: 'created'; interview: InterviewRecord }
  | { kind: 'candidate_not_available' };

export interface CandidateResponseInput {
  type: 'accept' | 'suggest_time' | 'decline';
  suggestedStartsAtUtc?: Date;
  suggestedTimezone?: string;
  message?: string | null;
  meeting?: { provider: string; externalId: string; joinUrl: string };
}

export interface InterviewsRepository {
  createCompanyInterview(companyId: string, requestedByUserId: string, input: InterviewCreateInput): Promise<CreateInterviewResult>;
  listForActor(actor: InterviewActor): Promise<InterviewRecord[]>;
  getForActor(actor: InterviewActor, interviewId: string): Promise<InterviewRecord | null>;
  candidateRespond(userId: string, interviewId: string, input: CandidateResponseInput): Promise<InterviewRecord | 'invalid_state' | null>;
  companyCancel(companyId: string, interviewId: string): Promise<InterviewRecord | 'invalid_state' | null>;
}
