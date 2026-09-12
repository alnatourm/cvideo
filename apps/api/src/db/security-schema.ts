import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userKindEnum = pgEnum('user_kind', ['candidate', 'company_member', 'super_admin']);
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'disabled']);
export const companyMemberRoleEnum = pgEnum('company_member_role', [
  'company_owner',
  'company_admin',
  'recruiter',
]);
export const companyMemberStatusEnum = pgEnum('company_member_status', ['active', 'suspended']);
export const companyVerificationStatusEnum = pgEnum('company_verification_status', [
  'pending',
  'verified',
  'rejected',
]);
export const companyOperationalStatusEnum = pgEnum('company_operational_status', ['active', 'suspended']);
export const sessionClientTypeEnum = pgEnum('session_client_type', ['web', 'mobile']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    kind: userKindEnum('kind').notNull(),
    status: accountStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    commercialRegistrationNumber: varchar('commercial_registration_number', { length: 160 }).notNull(),
    industry: varchar('industry', { length: 160 }),
    companySize: varchar('company_size', { length: 80 }),
    website: text('website'),
    logoUrl: text('logo_url'),
    description: text('description'),
    verificationStatus: companyVerificationStatusEnum('verification_status').notNull().default('pending'),
    operationalStatus: companyOperationalStatusEnum('operational_status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('companies_country_crn_unique').on(table.countryCode, table.commercialRegistrationNumber),
    index('companies_verification_status_idx').on(table.verificationStatus),
  ],
);

export const companyVerifications = pgTable(
  'company_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    submittedByUserId: uuid('submitted_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    status: companyVerificationStatusEnum('status').notNull().default('pending'),
    commercialRegistrationNumber: varchar('commercial_registration_number', { length: 160 }).notNull(),
    documentKey: text('document_key'),
    reviewedByAdminUserId: uuid('reviewed_by_admin_user_id').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    reviewNote: text('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('company_verifications_status_created_idx').on(table.status, table.createdAt),
    index('company_verifications_company_idx').on(table.companyId),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 120 }).notNull(),
    targetType: varchar('target_type', { length: 80 }).notNull(),
    targetId: uuid('target_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('audit_events_target_idx').on(table.targetType, table.targetId), index('audit_events_created_idx').on(table.createdAt)],
);

export const companyMembers = pgTable(
  'company_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: companyMemberRoleEnum('role').notNull(),
    status: companyMemberStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('company_members_company_user_unique').on(table.companyId, table.userId),
    uniqueIndex('company_members_user_unique').on(table.userId),
    index('company_members_company_role_idx').on(table.companyId, table.role),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    csrfHash: varchar('csrf_hash', { length: 64 }),
    clientType: sessionClientTypeEnum('client_type').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
    index('sessions_expiry_idx').on(table.expiresAt),
  ],
);
