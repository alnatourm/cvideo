export class AuthError extends Error {
  constructor(
    public readonly code:
      | 'EMAIL_IN_USE'
      | 'INVALID_CREDENTIALS'
      | 'ACCOUNT_INACTIVE'
      | 'UNAUTHENTICATED'
      | 'FORBIDDEN'
      | 'CSRF_INVALID',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
