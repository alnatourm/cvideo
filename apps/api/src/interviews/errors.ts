export class InterviewsError extends Error {
  constructor(
    public readonly code:
      | 'INTERVIEW_NOT_FOUND'
      | 'CANDIDATE_NOT_AVAILABLE'
      | 'INTERVIEW_INVALID_STATE'
      | 'INTERVIEW_ACTION_FORBIDDEN'
      | 'MEETING_PROVIDER_NOT_CONFIGURED',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'InterviewsError';
  }
}
