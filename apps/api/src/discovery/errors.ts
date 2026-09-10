export class DiscoveryError extends Error {
  constructor(
    public readonly code: 'DISCOVERY_NOT_READY' | 'CANDIDATE_NOT_FOUND',
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DiscoveryError';
  }
}
