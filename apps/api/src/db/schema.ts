import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const candidateVideoStatusEnum = pgEnum('candidate_video_status', [
  'pending',
  'uploading',
  'processing',
  'ready',
  'rejected',
  'failed',
]);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 80 }).notNull(),
    nameEn: varchar('name_en', { length: 160 }).notNull(),
    nameAr: varchar('name_ar', { length: 160 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_code_unique').on(table.code)],
);

export const subcategories = pgTable(
  'subcategories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 80 }).notNull(),
    nameEn: varchar('name_en', { length: 160 }).notNull(),
    nameAr: varchar('name_ar', { length: 160 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('subcategories_category_code_unique').on(table.categoryId, table.code),
    index('subcategories_category_idx').on(table.categoryId),
  ],
);

export const jobTitles = pgTable(
  'job_titles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 180 }).notNull(),
    nameAr: varchar('name_ar', { length: 180 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('job_titles_code_unique').on(table.code)],
);

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 100 }).notNull(),
    nameEn: varchar('name_en', { length: 180 }).notNull(),
    nameAr: varchar('name_ar', { length: 180 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('skills_code_unique').on(table.code)],
);

export const languages = pgTable(
  'languages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 16 }).notNull(),
    nameEn: varchar('name_en', { length: 120 }).notNull(),
    nameAr: varchar('name_ar', { length: 120 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('languages_code_unique').on(table.code)],
);

export const candidateProfiles = pgTable(
  'candidate_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    displayName: varchar('display_name', { length: 160 }).notNull(),
    headline: varchar('headline', { length: 180 }),
    profilePhotoUrl: text('profile_photo_url'),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    city: varchar('city', { length: 120 }).notNull(),
    primaryCategoryId: uuid('primary_category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    primarySubcategoryId: uuid('primary_subcategory_id').references(() => subcategories.id, {
      onDelete: 'set null',
    }),
    yearsExperience: integer('years_experience').notNull().default(0),
    professionalSummary: text('professional_summary'),
    cvStorageKey: text('cv_storage_key'),
    cvOriginalFilename: varchar('cv_original_filename', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('candidate_profiles_user_unique').on(table.userId),
    index('candidate_profiles_location_idx').on(table.countryCode, table.city),
    index('candidate_profiles_category_idx').on(table.primaryCategoryId, table.primarySubcategoryId),
  ],
);

// The user_id FK is intentionally deferred until the security-gated identity schema is implemented.

export const candidateExtraSubfields = pgTable(
  'candidate_extra_subfields',
  {
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    subcategoryId: uuid('subcategory_id')
      .notNull()
      .references(() => subcategories.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.candidateId, table.subcategoryId] }),
    uniqueIndex('candidate_extra_subfields_position_unique').on(table.candidateId, table.position),
  ],
);

export const candidatePreferredRoles = pgTable(
  'candidate_preferred_roles',
  {
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    jobTitleId: uuid('job_title_id')
      .notNull()
      .references(() => jobTitles.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.candidateId, table.jobTitleId] }),
    uniqueIndex('candidate_preferred_roles_position_unique').on(table.candidateId, table.position),
  ],
);

export const candidateSkills = pgTable(
  'candidate_skills',
  {
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.candidateId, table.skillId] })],
);

export const candidateLanguages = pgTable(
  'candidate_languages',
  {
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    languageId: uuid('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'restrict' }),
    proficiency: varchar('proficiency', { length: 32 }),
  },
  (table) => [primaryKey({ columns: [table.candidateId, table.languageId] })],
);

export const candidateExperiences = pgTable(
  'candidate_experiences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    companyName: varchar('company_name', { length: 180 }).notNull(),
    jobTitle: varchar('job_title', { length: 180 }).notNull(),
    location: varchar('location', { length: 180 }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    isCurrent: boolean('is_current').notNull().default(false),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('candidate_experiences_candidate_idx').on(table.candidateId)],
);

export const candidateEducation = pgTable(
  'candidate_education',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    institution: varchar('institution', { length: 200 }).notNull(),
    qualification: varchar('qualification', { length: 180 }).notNull(),
    fieldOfStudy: varchar('field_of_study', { length: 180 }),
    startDate: date('start_date'),
    endDate: date('end_date'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('candidate_education_candidate_idx').on(table.candidateId)],
);

export const candidateCertificates = pgTable(
  'candidate_certificates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    issuingOrganization: varchar('issuing_organization', { length: 200 }).notNull(),
    issueDate: date('issue_date'),
    expiryDate: date('expiry_date'),
    credentialId: varchar('credential_id', { length: 180 }),
    credentialUrl: text('credential_url'),
    attachmentStorageKey: text('attachment_storage_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('candidate_certificates_candidate_idx').on(table.candidateId)],
);

export const candidateVideos = pgTable(
  'candidate_videos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    candidateId: uuid('candidate_id')
      .notNull()
      .references(() => candidateProfiles.id, { onDelete: 'cascade' }),
    status: candidateVideoStatusEnum('status').notNull().default('pending'),
    storageKey: text('storage_key'),
    playbackKey: text('playback_key'),
    thumbnailKey: text('thumbnail_key'),
    originalFilename: varchar('original_filename', { length: 255 }),
    mimeType: varchar('mime_type', { length: 120 }),
    durationSeconds: integer('duration_seconds'),
    height: integer('height'),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('candidate_videos_candidate_unique').on(table.candidateId),
    index('candidate_videos_status_idx').on(table.status),
  ],
);
