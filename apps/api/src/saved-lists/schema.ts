import { index, pgTable, primaryKey, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { candidateProfiles } from '../db/schema.js';
import { companies, users } from '../db/security-schema.js';

export const savedLists = pgTable(
  'saved_lists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('saved_lists_company_idx').on(table.companyId)],
);

export const savedCandidates = pgTable(
  'saved_candidates',
  {
    listId: uuid('list_id')
      .notNull()
      .references(() => savedLists.id, { onDelete: 'cascade' }),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    addedByUserId: uuid('added_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.listId, table.candidateId] }),
    index('saved_candidates_candidate_idx').on(table.candidateId),
  ],
);
