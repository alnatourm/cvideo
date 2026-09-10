import { introductionVideoMetadataSchema } from '@cvideo/validation';
import type { MediaProvider, UploadIntent } from './media-provider.js';

export interface IntroductionVideoUploadRequest {
  candidateId: string;
  filename: string;
  mimeType: 'video/mp4' | 'video/webm' | 'video/quicktime';
  sizeBytes: number;
}

export interface IntroductionVideoCompletion {
  durationSeconds: number;
  height?: number;
  mimeType: 'video/mp4' | 'video/webm' | 'video/quicktime';
  sizeBytes: number;
}

export class VideoService {
  constructor(private readonly mediaProvider: MediaProvider) {}

  async createIntroductionUploadIntent(input: IntroductionVideoUploadRequest): Promise<UploadIntent> {
    introductionVideoMetadataSchema.pick({ mimeType: true, sizeBytes: true }).parse({
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    return this.mediaProvider.createUploadIntent({
      ownerId: input.candidateId,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      purpose: 'candidate_intro_video',
    });
  }

  validateCompletedIntroduction(input: IntroductionVideoCompletion) {
    return introductionVideoMetadataSchema.parse(input);
  }
}
