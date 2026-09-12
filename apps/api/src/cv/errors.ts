export class CvError extends Error {
  constructor(
    public readonly code:
      | 'PROFILE_NOT_FOUND'
      | 'CV_NOT_FOUND'
      | 'CV_INVALID'
      | 'DOCUMENT_PROVIDER_NOT_CONFIGURED'
      | 'DOCUMENT_PROVIDER_ERROR',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CvError';
  }
}
