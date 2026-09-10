import { z } from 'zod';
import { SavedListsError } from './errors.js';
import type { SavedListsRepository } from './repository.js';

const savedListInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
});

const uuidSchema = z.string().uuid();

export class SavedListsService {
  constructor(private readonly repository: SavedListsRepository) {}

  async list(companyId: string) {
    return this.repository.list(uuidSchema.parse(companyId));
  }

  async get(companyId: string, listId: string) {
    const list = await this.repository.get(uuidSchema.parse(companyId), uuidSchema.parse(listId));
    if (!list) throw new SavedListsError('LIST_NOT_FOUND', 404, 'Saved list not found');
    return list;
  }

  async create(companyId: string, actorUserId: string, input: unknown) {
    return this.repository.create(
      uuidSchema.parse(companyId),
      uuidSchema.parse(actorUserId),
      savedListInputSchema.parse(input),
    );
  }

  async update(companyId: string, listId: string, input: unknown) {
    const list = await this.repository.update(
      uuidSchema.parse(companyId),
      uuidSchema.parse(listId),
      savedListInputSchema.parse(input),
    );
    if (!list) throw new SavedListsError('LIST_NOT_FOUND', 404, 'Saved list not found');
    return list;
  }

  async delete(companyId: string, listId: string) {
    const deleted = await this.repository.delete(uuidSchema.parse(companyId), uuidSchema.parse(listId));
    if (!deleted) throw new SavedListsError('LIST_NOT_FOUND', 404, 'Saved list not found');
  }

  async addCandidate(companyId: string, listId: string, actorUserId: string, input: unknown) {
    const { candidateId } = z.object({ candidateId: uuidSchema }).parse(input);
    const result = await this.repository.addCandidate(
      uuidSchema.parse(companyId),
      uuidSchema.parse(listId),
      candidateId,
      uuidSchema.parse(actorUserId),
    );

    if (result === 'list_not_found') {
      throw new SavedListsError('LIST_NOT_FOUND', 404, 'Saved list not found');
    }
    if (result === 'candidate_not_found') {
      throw new SavedListsError('CANDIDATE_NOT_AVAILABLE', 404, 'Candidate is not available for discovery');
    }

    return this.get(companyId, listId);
  }

  async removeCandidate(companyId: string, listId: string, candidateId: string) {
    const removed = await this.repository.removeCandidate(
      uuidSchema.parse(companyId),
      uuidSchema.parse(listId),
      uuidSchema.parse(candidateId),
    );
    if (removed === null) throw new SavedListsError('LIST_NOT_FOUND', 404, 'Saved list not found');
    return removed;
  }
}
