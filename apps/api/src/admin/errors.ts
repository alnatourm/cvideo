export class AdminError extends Error {
  constructor(
    public readonly code: 'VERIFICATION_NOT_FOUND' | 'VERIFICATION_ALREADY_REVIEWED' | 'COMPANY_NOT_FOUND',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}
