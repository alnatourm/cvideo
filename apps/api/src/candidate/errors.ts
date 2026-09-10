export class CandidateError extends Error {
  constructor(
    public readonly code: 'PROFILE_NOT_FOUND' | 'RESOURCE_NOT_FOUND' | 'CONFLICT',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CandidateError';
  }
}
