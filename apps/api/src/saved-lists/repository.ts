export interface SavedListInput {
  name: string;
  description?: string | null;
}

export interface SavedListSummary {
  id: string;
  name: string;
  description: string | null;
  candidateCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedListDetail extends SavedListSummary {
  candidateIds: string[];
}

export type AddCandidateResult = 'ok' | 'list_not_found' | 'candidate_not_found';

export interface SavedListsRepository {
  list(companyId: string): Promise<SavedListSummary[]>;
  get(companyId: string, listId: string): Promise<SavedListDetail | null>;
  create(companyId: string, actorUserId: string, input: SavedListInput): Promise<SavedListDetail>;
  update(companyId: string, listId: string, input: SavedListInput): Promise<SavedListDetail | null>;
  delete(companyId: string, listId: string): Promise<boolean>;
  addCandidate(companyId: string, listId: string, candidateId: string, actorUserId: string): Promise<AddCandidateResult>;
  removeCandidate(companyId: string, listId: string, candidateId: string): Promise<boolean | null>;
}
