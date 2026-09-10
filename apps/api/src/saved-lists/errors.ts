export class SavedListsError extends Error {
  constructor(
    public readonly code: 'LIST_NOT_FOUND' | 'CANDIDATE_NOT_AVAILABLE',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SavedListsError';
  }
}
