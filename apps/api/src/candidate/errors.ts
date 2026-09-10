export class CandidateError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'CONFLICT',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CandidateError';
  }
}
