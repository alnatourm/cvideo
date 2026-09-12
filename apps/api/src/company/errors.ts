export class CompanyError extends Error {
  constructor(
    public readonly code: 'COMPANY_NOT_FOUND' | 'MEMBER_NOT_FOUND' | 'MEMBER_CHANGE_FORBIDDEN',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CompanyError';
  }
}
