import { z } from 'zod';

export const localeSchema = z.enum(['en', 'ar']);

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('cvideo-api'),
  version: z.literal('v1'),
});

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().date();
const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(12).max(128);

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  clientType: z.enum(['web', 'mobile']).default('web'),
});

export const candidateRegistrationInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(160),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  city: z.string().trim().min(1).max(120),
});

export const companyRegistrationInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  companyName: z.string().trim().min(2).max(200),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  city: z.string().trim().min(1).max(120),
  commercialRegistrationNumber: z.string().trim().min(1).max(160),
});

export const companyMemberRoleSchema = z.enum(['company_owner', 'company_admin', 'recruiter']);

export const introductionVideoMetadataSchema = z.object({
  durationSeconds: z.number().nonnegative().max(30),
  height: z.number().int().positive().max(720).optional(),
  mimeType: z.enum(['video/mp4', 'video/webm', 'video/quicktime']),
  sizeBytes: z.number().int().positive().max(250 * 1024 * 1024),
});

export const candidateProfileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(160),
  headline: z.string().trim().max(180).optional().nullable(),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  city: z.string().trim().min(1).max(120),
  primaryCategoryId: uuidSchema.optional().nullable(),
  primarySubcategoryId: uuidSchema.optional().nullable(),
  extraSubfieldIds: z.array(uuidSchema).max(2).default([]),
  preferredRoleIds: z.array(uuidSchema).max(5).default([]),
  skillIds: z.array(uuidSchema).max(50).default([]),
  languageIds: z.array(uuidSchema).max(20).default([]),
  yearsExperience: z.number().int().min(0).max(80),
  professionalSummary: z.string().trim().max(2000).optional().nullable(),
});

export const candidateExperienceInputSchema = z
  .object({
    companyName: z.string().trim().min(1).max(180),
    jobTitle: z.string().trim().min(1).max(180),
    location: z.string().trim().max(180).optional().nullable(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.optional().nullable(),
    isCurrent: z.boolean().default(false),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.isCurrent && value.endDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Current experience cannot have an end date' });
    }
    if (value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date' });
    }
  });

export const candidateEducationInputSchema = z
  .object({
    institution: z.string().trim().min(1).max(200),
    qualification: z.string().trim().min(1).max(180),
    fieldOfStudy: z.string().trim().max(180).optional().nullable(),
    startDate: isoDateSchema.optional().nullable(),
    endDate: isoDateSchema.optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date' });
    }
  });

export const candidateCertificateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    issuingOrganization: z.string().trim().min(1).max(200),
    issueDate: isoDateSchema.optional().nullable(),
    expiryDate: isoDateSchema.optional().nullable(),
    credentialId: z.string().trim().max(180).optional().nullable(),
    credentialUrl: z.string().url().max(2048).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.issueDate && value.expiryDate && value.expiryDate < value.issueDate) {
      ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date cannot be before issue date' });
    }
  });

export const candidateCvUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mimeType: z.enum(['application/pdf']),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});
