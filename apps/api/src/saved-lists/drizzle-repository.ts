import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { candidateProfiles, candidateVideos } from '../db/schema.js';
import { candidateDiscoverySettings } from '../discovery/schema.js';
import { savedCandidates, savedLists } from './schema.js';
import type {
  AddCandidateResult,
  SavedListDetail,
  SavedListInput,
  SavedListSummary,
  SavedListsRepository,
} from './repository.js';

export class DrizzleSavedListsRepository implements SavedListsRepository {
  constructor(private readonly db: Database) {}

  async list(companyId: string): Promise<SavedListSummary[]> {
    return this.db
      .select({
        id: savedLists.id,
        name: savedLists.name,
        description: savedLists.description,
        candidateCount: sql<number>`count(${savedCandidates.candidateId})::int`,
        createdAt: savedLists.createdAt,
        updatedAt: savedLists.updatedAt,
      })
      .from(savedLists)
      .leftJoin(savedCandidates, eq(savedCandidates.listId, savedLists.id))
      .where(eq(savedLists.companyId, companyId))
      .groupBy(savedLists.id)
      .orderBy(desc(savedLists.updatedAt));
  }

  async get(companyId: string, listId: string): Promise<SavedListDetail | null> {
    const [row] = await this.db
      .select({
        id: savedLists.id,
        name: savedLists.name,
        description: savedLists.description,
        createdAt: savedLists.createdAt,
        updatedAt: savedLists.updatedAt,
      })
      .from(savedLists)
      .where(and(eq(savedLists.id, listId), eq(savedLists.companyId, companyId)))
      .limit(1);
    if (!row) return null;

    const candidates = await this.db
      .select({ candidateId: savedCandidates.candidateId })
      .from(savedCandidates)
      .where(eq(savedCandidates.listId, listId))
      .orderBy(desc(savedCandidates.createdAt));

    return {
      ...row,
      candidateCount: candidates.length,
      candidateIds: candidates.map((candidate) => candidate.candidateId),
    };
  }

  async create(companyId: string, actorUserId: string, input: SavedListInput): Promise<SavedListDetail> {
    const [row] = await this.db
      .insert(savedLists)
      .values({
        companyId,
        createdByUserId: actorUserId,
        name: input.name,
        description: input.description ?? null,
      })
      .returning({ id: savedLists.id });
    if (!row) throw new Error('Failed to create saved list');
    const created = await this.get(companyId, row.id);
    if (!created) throw new Error('Failed to read created saved list');
    return created;
  }

  async update(companyId: string, listId: string, input: SavedListInput): Promise<SavedListDetail | null> {
    const [row] = await this.db
      .update(savedLists)
      .set({ name: input.name, description: input.description ?? null, updatedAt: new Date() })
      .where(and(eq(savedLists.id, listId), eq(savedLists.companyId, companyId)))
      .returning({ id: savedLists.id });
    return row ? this.get(companyId, row.id) : null;
  }

  async delete(companyId: string, listId: string): Promise<boolean> {
    const rows = await this.db
      .delete(savedLists)
      .where(and(eq(savedLists.id, listId), eq(savedLists.companyId, companyId)))
      .returning({ id: savedLists.id });
    return rows.length > 0;
  }

  async addCandidate(
    companyId: string,
    listId: string,
    candidateId: string,
    actorUserId: string,
  ): Promise<AddCandidateResult> {
    const [list] = await this.db
      .select({ id: savedLists.id })
      .from(savedLists)
      .where(and(eq(savedLists.id, listId), eq(savedLists.companyId, companyId)))
      .limit(1);
    if (!list) return 'list_not_found';

    const [candidate] = await this.db
      .select({ id: candidateProfiles.id })
      .from(candidateProfiles)
      .innerJoin(candidateDiscoverySettings, eq(candidateDiscoverySettings.candidateId, candidateProfiles.id))
      .innerJoin(candidateVideos, eq(candidateVideos.candidateId, candidateProfiles.id))
      .where(
        and(
          eq(candidateProfiles.id, candidateId),
          eq(candidateDiscoverySettings.discoverable, true),
          eq(candidateVideos.status, 'ready'),
        ),
      )
      .limit(1);
    if (!candidate) return 'candidate_not_found';

    await this.db
      .insert(savedCandidates)
      .values({ listId, candidateId, addedByUserId: actorUserId })
      .onConflictDoNothing();
    await this.db.update(savedLists).set({ updatedAt: new Date() }).where(eq(savedLists.id, listId));
    return 'ok';
  }

  async removeCandidate(companyId: string, listId: string, candidateId: string): Promise<boolean | null> {
    const [list] = await this.db
      .select({ id: savedLists.id })
      .from(savedLists)
      .where(and(eq(savedLists.id, listId), eq(savedLists.companyId, companyId)))
      .limit(1);
    if (!list) return null;

    const rows = await this.db
      .delete(savedCandidates)
      .where(and(eq(savedCandidates.listId, listId), eq(savedCandidates.candidateId, candidateId)))
      .returning({ listId: savedCandidates.listId });
    if (rows.length) {
      await this.db.update(savedLists).set({ updatedAt: new Date() }).where(eq(savedLists.id, listId));
    }
    return rows.length > 0;
  }
}
