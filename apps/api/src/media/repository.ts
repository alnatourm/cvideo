import type { CandidateVideoStatus } from '@cvideo/types';

export interface CandidateVideoMediaRecord {
  id: string;
  candidateId: string;
  status: CandidateVideoStatus;
  providerAssetId: string | null;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  durationSeconds: number | null;
  height: number | null;
  failureReason: string | null;
}

export interface CandidateVideoAllocationInput {
  providerAssetId: string;
  originalFilename: string;
  mimeType: string;
  durationSeconds: number;
  height: number | null;
}

export interface CandidateVideoProviderUpdate {
  status: CandidateVideoStatus;
  playbackUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  height?: number | null;
  failureReason?: string | null;
}

export interface MediaRepository {
  getVideoByUserId(userId: string): Promise<CandidateVideoMediaRecord | null>;
  allocateVideoForUser(userId: string, input: CandidateVideoAllocationInput): Promise<CandidateVideoMediaRecord | null>;
  updateVideoForUser(userId: string, update: CandidateVideoProviderUpdate): Promise<CandidateVideoMediaRecord | null>;
  deleteVideoForUser(userId: string): Promise<boolean>;
}
