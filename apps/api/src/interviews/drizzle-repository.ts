import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { candidateProfiles, candidateVideos } from '../db/schema.js';
import { candidateDiscoverySettings } from '../discovery/schema.js';
import { interviews } from './schema.js';
import type {
  CandidateResponseInput,
  CreateInterviewResult,
  InterviewActor,
  InterviewCreateInput,
  InterviewRecord,
  InterviewsRepository,
} from './repository.js';

function mapInterview(row: typeof interviews.$inferSelect): InterviewRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    candidateId: row.candidateId,
    requestedByUserId: row.requestedByUserId,
    opportunityTitle: row.opportunityTitle,
    startsAtUtc: row.startsAtUtc,
    timezone: row.timezone,
    durationMinutes: row.durationMinutes,
    meetingType: row.meetingType,
    message: row.message,
    location: row.location,
    status: row.status,
    suggestedStartsAtUtc: row.suggestedStartsAtUtc,
    suggestedTimezone: row.suggestedTimezone,
    suggestedMessage: row.suggestedMessage,
    meetingProvider: row.meetingProvider,
    meetingExternalId: row.meetingExternalId,
    meetingJoinUrl: row.meetingJoinUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleInterviewsRepository implements InterviewsRepository {
  constructor(private readonly db: Database) {}

  async createCompanyInterview(
    companyId: string,
    requestedByUserId: string,
    input: InterviewCreateInput,
  ): Promise<CreateInterviewResult> {
    const [candidate] = await this.db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .innerJoin(candidateDiscoverySettings, eq(candidateDiscoverySettings.candidateId, candidateProfiles.id))
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(
        and(
          eq(candidateProfiles.id, input.candidateId),
          eq(candidateDiscoverySettings.discoverable, true),
          eq(candidateVideos.status, 'ready'),
        ),
      )
      .limit(1);
    if (!candidate) return { kind: 'candidate_not_available' };

    const [row] = await this.db
      .insert(interviews)
      .values({
        companyId,
        candidateId: input.candidateId,
        requestedByUserId,
        opportunityTitle: input.opportunityTitle,
        startsAtUtc: input.startsAtUtc,
        timezone: input.timezone,
        durationMinutes: input.durationMinutes,
        meetingType: input.meetingType,
        message: input.message ?? null,
        location: input.location ?? null,
      })
      .returning();
    if (!row) throw new Error('Failed to create interview request');
    return { kind: 'created', interview: mapInterview(row) };
  }

  async listForActor(actor: InterviewActor): Promise<InterviewRecord[]> {
    const query = this.db
      .select({ interview: interviews })
      .from(interviews)
      .innerJoin(candidateProfiles, eq(candidateProfiles.id, interviews.candidateId));

    const rows = actor.companyId
      ? await query.where(eq(interviews.companyId, actor.companyId)).orderBy(asc(interviews.startsAtUtc))
      : await query.where(eq(candidateProfiles.userId, actor.userId)).orderBy(asc(interviews.startsAtUtc));
    return rows.map((row) => mapInterview(row.interview));
  }

  async getForActor(actor: InterviewActor, interviewId: string): Promise<InterviewRecord | null> {
    const query = this.db
      .select({ interview: interviews })
      .from(interviews)
      .innerJoin(candidateProfiles, eq(candidateProfiles.id, interviews.candidateId));

    const [row] = actor.companyId
      ? await query.where(and(eq(interviews.id, interviewId), eq(interviews.companyId, actor.companyId))).limit(1)
      : await query.where(and(eq(interviews.id, interviewId), eq(candidateProfiles.userId, actor.userId))).limit(1);
    return row ? mapInterview(row.interview) : null;
  }

  async candidateRespond(
    userId: string,
    interviewId: string,
    input: CandidateResponseInput,
  ): Promise<InterviewRecord | 'invalid_state' | null> {
    const [owned] = await this.db
      .select({ interview: interviews })
      .from(interviews)
      .innerJoin(candidateProfiles, eq(candidateProfiles.id, interviews.candidateId))
      .where(and(eq(interviews.id, interviewId), eq(candidateProfiles.userId, userId)))
      .limit(1);
    if (!owned) return null;
    if (owned.interview.status !== 'pending') return 'invalid_state';

    const now = new Date();
    const values = input.type === 'accept'
      ? {
          status: 'accepted' as const,
          meetingProvider: input.meeting?.provider ?? null,
          meetingExternalId: input.meeting?.externalId ?? null,
          meetingJoinUrl: input.meeting?.joinUrl ?? null,
          updatedAt: now,
        }
      : input.type === 'suggest_time'
        ? {
            status: 'suggested_time' as const,
            suggestedStartsAtUtc: input.suggestedStartsAtUtc ?? null,
            suggestedTimezone: input.suggestedTimezone ?? null,
            suggestedMessage: input.message ?? null,
            updatedAt: now,
          }
        : { status: 'declined' as const, suggestedMessage: input.message ?? null, updatedAt: now };

    const [updated] = await this.db
      .update(interviews)
      .set(values)
      .where(and(eq(interviews.id, interviewId), eq(interviews.status, 'pending')))
      .returning();
    return updated ? mapInterview(updated) : 'invalid_state';
  }

  async companyCancel(companyId: string, interviewId: string): Promise<InterviewRecord | 'invalid_state' | null> {
    const [owned] = await this.db
      .select()
      .from(interviews)
      .where(and(eq(interviews.id, interviewId), eq(interviews.companyId, companyId)))
      .limit(1);
    if (!owned) return null;
    if (!['pending', 'accepted', 'suggested_time'].includes(owned.status)) return 'invalid_state';

    const [updated] = await this.db
      .update(interviews)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(
        and(
          eq(interviews.id, interviewId),
          eq(interviews.companyId, companyId),
          inArray(interviews.status, ['pending', 'accepted', 'suggested_time']),
        ),
      )
      .returning();
    return updated ? mapInterview(updated) : 'invalid_state';
  }
}
