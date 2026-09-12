import { and, eq, exists, isNotNull, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { candidatePreferredRoles, candidateProfiles, candidateSkills, candidateVideos } from '../db/schema.js';
import { candidateDiscoverySettings } from '../discovery/schema.js';
import type { CandidateCvRecord, CvRepository } from './repository.js';

const selection = {
  candidateId: candidateProfiles.id,
  storageKey: candidateProfiles.cvStorageKey,
  originalFilename: candidateProfiles.cvOriginalFilename,
};

export class DrizzleCvRepository implements CvRepository {
  constructor(private readonly db: Database) {}

  async getByUserId(userId: string): Promise<CandidateCvRecord | null> {
    const [row] = await this.db.select(selection).from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1);
    return row ?? null;
  }

  async getDiscoverableByCandidateId(candidateId: string): Promise<CandidateCvRecord | null> {
    const [row] = await this.db
      .select(selection)
      .from(candidateProfiles)
      .innerJoin(candidateDiscoverySettings, eq(candidateDiscoverySettings.candidateId, candidateProfiles.id))
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(and(
        eq(candidateProfiles.id, candidateId),
        eq(candidateDiscoverySettings.discoverable, true),
        eq(candidateVideos.status, 'ready'),
        isNotNull(candidateVideos.playbackKey),
        isNotNull(candidateProfiles.primaryCategoryId),
        isNotNull(candidateProfiles.primarySubcategoryId),
        exists(this.db.select({ value: sql`1` }).from(candidatePreferredRoles).where(eq(candidatePreferredRoles.candidateId, candidateProfiles.id))),
        exists(this.db.select({ value: sql`1` }).from(candidateSkills).where(eq(candidateSkills.candidateId, candidateProfiles.id))),
      ))
      .limit(1);
    return row ?? null;
  }

  async setByUserId(userId: string, storageKey: string, originalFilename: string): Promise<CandidateCvRecord | null> {
    const [row] = await this.db
      .update(candidateProfiles)
      .set({ cvStorageKey: storageKey, cvOriginalFilename: originalFilename, updatedAt: new Date() })
      .where(eq(candidateProfiles.userId, userId))
      .returning(selection);
    return row ?? null;
  }

  async clearByUserId(userId: string): Promise<CandidateCvRecord | null> {
    const current = await this.getByUserId(userId);
    if (!current) return null;
    await this.db
      .update(candidateProfiles)
      .set({ cvStorageKey: null, cvOriginalFilename: null, updatedAt: new Date() })
      .where(eq(candidateProfiles.userId, userId));
    return current;
  }
}
