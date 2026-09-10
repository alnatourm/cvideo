export class MessagingError extends Error {
  constructor(
    public readonly code:
      | 'CONVERSATION_NOT_FOUND'
      | 'CANDIDATE_NOT_AVAILABLE'
      | 'CONVERSATION_INITIATION_FORBIDDEN',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MessagingError';
  }
}
