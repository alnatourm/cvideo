import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { candidateProfiles, candidateVideos } from '../db/schema.js';
import type {
  CandidateVideoAllocationInput,
  CandidateVideoMediaRecord,
  CandidateVideoProviderUpdate,
  MediaRepository,
} from './repository.js';

function mapVideo(row: {
  id: string;
  candidateId: string;
  status: CandidateVideoMediaRecord['status'];
  storageKey: string | null;
  playbackKey: string | null;
  thumbnailKey: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  durationSeconds: number | null;
  height: number | null;
  failureReason: string | null;
}): CandidateVideoMediaRecord {
  return {
    id: row.id,
    candidateId: row.candidateId,
    status: row.status,
    providerAssetId: row.storageKey,
    playbackUrl: row.playbackKey,
    thumbnailUrl: row.thumbnailKey,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    durationSeconds: row.durationSeconds,
    height: row.height,
    failureReason: row.failureReason,
  };
}

export class DrizzleMediaRepository implements MediaRepository {
  constructor(private readonly db: Database) {}

  private async candidateIdForUser(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .where(eq(candidateProfiles.userId, userId))
      .limit(1);
    return row?.id ?? null;
  }

  async getVideoByUserId(userId: string): Promise<CandidateVideoMediaRecord | null> {
    const [row] = await this.db
      .select({
        id: candidateVideos.id,
        candidateId: candidateVideos.candidateId,
        status: candidateVideos.status,
        storageKey: candidateVideos.storageKey,
        playbackKey: candidateVideos.playbackKey,
        thumbnailKey: candidateVideos.thumbnailKey,
        originalFilename: candidateVideos.originalFilename,
        mimeType: candidateVideos.mimeType,
        durationSeconds: candidateVideos.durationSeconds,
        height: candidateVideos.height,
        failureReason: candidateVideos.failureReason,
      })
      .from(candidateProfiles)
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(eq(candidateProfiles.userId, userId))
      .limit(1);
    return row ? mapVideo(row) : null;
  }

  async allocateVideoForUser(
    userId: string,
    input: CandidateVideoAllocationInput,
  ): Promise<CandidateVideoMediaRecord | null> {
    const candidateId = await this.candidateIdForUser(userId);
    if (!candidateId) return null;

    await this.db
      .insert(candidateVideos)
      .values({
        candidateId,
        status: 'uploading',
        storageKey: input.providerAssetId,
        playbackKey: null,
        thumbnailKey: null,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        durationSeconds: input.durationSeconds,
        height: input.height,
        failureReason: null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: candidateVideos.candidateId,
        set: {
          status: 'uploading',
          storageKey: input.providerAssetId,
          playbackKey: null,
          thumbnailKey: null,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          durationSeconds: input.durationSeconds,
          height: input.height,
          failureReason: null,
          updatedAt: new Date(),
        },
      });

    return this.getVideoByUserId(userId);
  }

  async updateVideoForUser(
    userId: string,
    update: CandidateVideoProviderUpdate,
  ): Promise<CandidateVideoMediaRecord | null> {
    const candidateId = await this.candidateIdForUser(userId);
    if (!candidateId) return null;

    const set: Record<string, unknown> = {
      status: update.status,
      updatedAt: new Date(),
    };
    if ('playbackUrl' in update) set.playbackKey = update.playbackUrl ?? null;
    if ('thumbnailUrl' in update) set.thumbnailKey = update.thumbnailUrl ?? null;
    if ('durationSeconds' in update) set.durationSeconds = update.durationSeconds ?? null;
    if ('height' in update) set.height = update.height ?? null;
    if ('failureReason' in update) set.failureReason = update.failureReason ?? null;

    const rows = await this.db
      .update(candidateVideos)
      .set(set)
      .where(eq(candidateVideos.candidateId, candidateId))
      .returning({ id: candidateVideos.id });
    if (!rows.length) return null;
    return this.getVideoByUserId(userId);
  }

  async deleteVideoForUser(userId: string): Promise<boolean> {
    const candidateId = await this.candidateIdForUser(userId);
    if (!candidateId) return false;
    const rows = await this.db
      .delete(candidateVideos)
      .where(eq(candidateVideos.candidateId, candidateId))
      .returning({ id: candidateVideos.id });
    return rows.length > 0;
  }
}
