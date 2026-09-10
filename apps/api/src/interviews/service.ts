import { z } from 'zod';
import { InterviewsError } from './errors.js';
import type { MeetingProvider } from './meeting-provider.js';
import type { InterviewActor, InterviewsRepository } from './repository.js';

const uuidSchema = z.string().uuid();
const createInterviewSchema = z
  .object({
    candidateId: uuidSchema,
    opportunityTitle: z.string().trim().min(1).max(180),
    startsAtUtc: z.coerce.date(),
    timezone: z.string().trim().min(1).max(80),
    durationMinutes: z.number().int().min(10).max(240),
    meetingType: z.enum(['google_meet', 'video_call', 'in_person']),
    message: z.string().trim().max(3000).optional().nullable(),
    location: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.meetingType === 'in_person' && !value.location) {
      ctx.addIssue({ code: 'custom', path: ['location'], message: 'Location is required for in-person interviews' });
    }
  });

const suggestTimeSchema = z.object({
  startsAtUtc: z.coerce.date(),
  timezone: z.string().trim().min(1).max(80),
  message: z.string().trim().max(3000).optional().nullable(),
});

const responseMessageSchema = z.object({ message: z.string().trim().max(3000).optional().nullable() });

export class InterviewsService {
  constructor(
    private readonly repository: InterviewsRepository,
    private readonly googleMeetProvider?: MeetingProvider,
  ) {}

  private normalizedActor(actor: InterviewActor): InterviewActor {
    return {
      userId: uuidSchema.parse(actor.userId),
      companyId: actor.companyId ? uuidSchema.parse(actor.companyId) : null,
    };
  }

  async create(actor: InterviewActor, input: unknown) {
    const normalized = this.normalizedActor(actor);
    if (!normalized.companyId) {
      throw new InterviewsError('INTERVIEW_ACTION_FORBIDDEN', 403, 'Only a company member may request an interview');
    }
    const value = createInterviewSchema.parse(input);
    const result = await this.repository.createCompanyInterview(normalized.companyId, normalized.userId, value);
    if (result.kind === 'candidate_not_available') {
      throw new InterviewsError('CANDIDATE_NOT_AVAILABLE', 404, 'Candidate is not available for discovery');
    }
    return result.interview;
  }

  async list(actor: InterviewActor) {
    return this.repository.listForActor(this.normalizedActor(actor));
  }

  async get(actor: InterviewActor, interviewId: string) {
    const interview = await this.repository.getForActor(this.normalizedActor(actor), uuidSchema.parse(interviewId));
    if (!interview) throw new InterviewsError('INTERVIEW_NOT_FOUND', 404, 'Interview request not found');
    return interview;
  }

  async accept(actor: InterviewActor, interviewId: string) {
    const normalized = this.normalizedActor(actor);
    if (normalized.companyId) {
      throw new InterviewsError('INTERVIEW_ACTION_FORBIDDEN', 403, 'Only the candidate may accept an interview');
    }

    const interview = await this.get(normalized, interviewId);
    if (interview.status !== 'pending') {
      throw new InterviewsError('INTERVIEW_INVALID_STATE', 409, 'Interview request is not pending');
    }

    let meeting: { provider: string; externalId: string; joinUrl: string } | undefined;
    if (interview.meetingType === 'google_meet') {
      if (!this.googleMeetProvider) {
        throw new InterviewsError('MEETING_PROVIDER_NOT_CONFIGURED', 503, 'Google Meet provider is not configured');
      }
      try {
        meeting = await this.googleMeetProvider.createMeeting({
          requestId: interview.id,
          title: interview.opportunityTitle,
          startsAtUtc: interview.startsAtUtc,
          durationMinutes: interview.durationMinutes,
          timezone: interview.timezone,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'GOOGLE_MEET_NOT_CONFIGURED') {
          throw new InterviewsError('MEETING_PROVIDER_NOT_CONFIGURED', 503, 'Google Meet provider is not configured');
        }
        throw error;
      }
    }

    const updated = await this.repository.candidateRespond(normalized.userId, interview.id, { type: 'accept', meeting });
    if (updated === null) throw new InterviewsError('INTERVIEW_NOT_FOUND', 404, 'Interview request not found');
    if (updated === 'invalid_state') throw new InterviewsError('INTERVIEW_INVALID_STATE', 409, 'Interview request is not pending');
    return updated;
  }

  async suggestTime(actor: InterviewActor, interviewId: string, input: unknown) {
    const normalized = this.normalizedActor(actor);
    if (normalized.companyId) {
      throw new InterviewsError('INTERVIEW_ACTION_FORBIDDEN', 403, 'Only the candidate may suggest another time');
    }
    const value = suggestTimeSchema.parse(input);
    const updated = await this.repository.candidateRespond(normalized.userId, uuidSchema.parse(interviewId), {
      type: 'suggest_time',
      suggestedStartsAtUtc: value.startsAtUtc,
      suggestedTimezone: value.timezone,
      message: value.message,
    });
    if (updated === null) throw new InterviewsError('INTERVIEW_NOT_FOUND', 404, 'Interview request not found');
    if (updated === 'invalid_state') throw new InterviewsError('INTERVIEW_INVALID_STATE', 409, 'Interview request is not pending');
    return updated;
  }

  async decline(actor: InterviewActor, interviewId: string, input: unknown) {
    const normalized = this.normalizedActor(actor);
    if (normalized.companyId) {
      throw new InterviewsError('INTERVIEW_ACTION_FORBIDDEN', 403, 'Only the candidate may decline an interview');
    }
    const { message } = responseMessageSchema.parse(input ?? {});
    const updated = await this.repository.candidateRespond(normalized.userId, uuidSchema.parse(interviewId), {
      type: 'decline',
      message,
    });
    if (updated === null) throw new InterviewsError('INTERVIEW_NOT_FOUND', 404, 'Interview request not found');
    if (updated === 'invalid_state') throw new InterviewsError('INTERVIEW_INVALID_STATE', 409, 'Interview request is not pending');
    return updated;
  }

  async cancel(actor: InterviewActor, interviewId: string) {
    const normalized = this.normalizedActor(actor);
    if (!normalized.companyId) {
      throw new InterviewsError('INTERVIEW_ACTION_FORBIDDEN', 403, 'Only the requesting company may cancel an interview');
    }
    const updated = await this.repository.companyCancel(normalized.companyId, uuidSchema.parse(interviewId));
    if (updated === null) throw new InterviewsError('INTERVIEW_NOT_FOUND', 404, 'Interview request not found');
    if (updated === 'invalid_state') throw new InterviewsError('INTERVIEW_INVALID_STATE', 409, 'Interview request cannot be cancelled');
    return updated;
  }
}
