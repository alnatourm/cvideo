export class MediaError extends Error {
  constructor(
    public readonly code:
      | 'PROFILE_NOT_FOUND'
      | 'VIDEO_NOT_STARTED'
      | 'VIDEO_NOT_READY'
      | 'VIDEO_INVALID'
      | 'MEDIA_PROVIDER_NOT_CONFIGURED'
      | 'MEDIA_PROVIDER_ERROR',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}
