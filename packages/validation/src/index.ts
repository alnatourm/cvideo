import { z } from 'zod';

export const localeSchema = z.enum(['en', 'ar']);
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('cvideo-api'),
  version: z.literal('v1'),
});

export const introductionVideoMetadataSchema = z.object({
  durationSeconds: z.number().nonnegative().max(30),
  height: z.number().int().positive().max(720).optional(),
  mimeType: z.string().min(1),
});
