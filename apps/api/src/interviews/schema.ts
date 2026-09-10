import { index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { candidateProfiles } from '../db/schema.js';
import { companies, users } from '../db/security-schema.js';

export const interviewMeetingTypeEnum = pgEnum('interview_meeting_type', ['google_meet', 'video_call', 'in_person']);
export const interviewStatusEnum = pgEnum('interview_status', ['pending', 'accepted', 'suggested_time', 'declined', 'cancelled']);

export const interviews = pgTable(
  'interviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id').notNull().references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    requestedByUserId: uuid('requested_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    opportunityTitle: varchar('opportunity_title', { length: 180 }).notNull(),
    startsAtUtc: timestamp('starts_at_utc', { withTimezone: true }).notNull(),
    timezone: varchar('timezone', { length: 80 }).notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    meetingType: interviewMeetingTypeEnum('meeting_type').notNull(),
    message: text('message'),
    location: text('location'),
    status: interviewStatusEnum('status').notNull().default('pending'),
    suggestedStartsAtUtc: timestamp('suggested_starts_at_utc', { withTimezone: true }),
    suggestedTimezone: varchar('suggested_timezone', { length: 80 }),
    suggestedMessage: text('suggested_message'),
    meetingProvider: varchar('meeting_provider', { length: 80 }),
    meetingExternalId: text('meeting_external_id'),
    meetingJoinUrl: text('meeting_join_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('interviews_company_status_idx').on(table.companyId, table.status, table.startsAtUtc),
    index('interviews_candidate_status_idx').on(table.candidateId, table.status, table.startsAtUtc),
  ],
);
