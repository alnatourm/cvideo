import { boolean, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { candidateProfiles } from '../db/schema.js';

export const candidateDiscoverySettings = pgTable(
  'candidate_discovery_settings',
  {
    candidateId: uuid('candidate_id')
      .primaryKey()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    discoverable: boolean('discoverable').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('candidate_discovery_settings_discoverable_idx').on(table.discoverable)],
);
