import { z } from 'zod';
import { DiscoveryError } from './errors.js';
import type { DiscoveryRepository } from './repository.js';

const visibilityInputSchema = z.object({ discoverable: z.boolean() });

const recruiterSearchSchema = z.object({
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  city: z.string().trim().min(1).max(120).optional(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  preferredRoleId: z.string().uuid().optional(),
  skillId: z.string().uuid().optional(),
  languageId: z.string().uuid().optional(),
  minExperienceYears: z.coerce.number().int().min(0).max(80).optional(),
  cursor: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

const candidateIdSchema = z.string().uuid();

export class DiscoveryService {
  constructor(private readonly repository: DiscoveryRepository) {}

  async getOwnVisibility(userId: string) {
    const discoverable = await this.repository.getVisibilityByUserId(userId);
    if (discoverable === null) throw new DiscoveryError('CANDIDATE_NOT_FOUND', 404, 'Candidate profile not found');
    return { discoverable };
  }

  async setOwnVisibility(userId: string, input: unknown) {
    const value = visibilityInputSchema.parse(input);

    if (value.discoverable) {
      const readiness = await this.repository.getReadinessByUserId(userId);
      if (!readiness) throw new DiscoveryError('CANDIDATE_NOT_FOUND', 404, 'Candidate profile not found');

      if (!readiness.hasReadyVideo || !readiness.hasCategory || !readiness.hasPreferredRole || !readiness.hasSkill) {
        throw new DiscoveryError(
          'DISCOVERY_NOT_READY',
          409,
          'A ready Introduction Video, category, preferred role and skill are required before discovery can be enabled',
        );
      }
    }

    const discoverable = await this.repository.setVisibilityByUserId(userId, value.discoverable);
    if (discoverable === null) throw new DiscoveryError('CANDIDATE_NOT_FOUND', 404, 'Candidate profile not found');
    return { discoverable };
  }

  async searchCandidates(input: unknown) {
    const filters = recruiterSearchSchema.parse(input);
    return this.repository.searchCandidates(filters);
  }

  async getCandidateDetail(candidateId: unknown) {
    const id = candidateIdSchema.parse(candidateId);
    const candidate = await this.repository.getCandidateDetail(id);
    if (!candidate) throw new DiscoveryError('CANDIDATE_NOT_FOUND', 404, 'Candidate not found');
    return candidate;
  }
}
