export interface CreateUploadIntentInput {
  ownerId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: 'candidate_intro_video' | 'candidate_cv' | 'candidate_certificate';
}

export interface UploadIntent {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
  headers?: Record<string, string>;
}

export interface PlaybackAsset {
  playbackUrl: string;
  thumbnailUrl?: string;
}

export interface MediaProvider {
  createUploadIntent(input: CreateUploadIntentInput): Promise<UploadIntent>;
  getPlaybackAsset(storageKey: string): Promise<PlaybackAsset>;
  deleteObject(storageKey: string): Promise<void>;
}
