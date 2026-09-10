import { candidateVideoStartSchema } from '@cvideo/validation';
import { MediaError } from './errors.js';
import type { CandidateVideoMediaRecord, MediaRepository } from './repository.js';
import type { VideoProvider } from './provider.js';

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function presentVideo(record: CandidateVideoMediaRecord) {
  return {
    id: record.id,
    status: record.status,
    playbackUrl: record.playbackUrl,
    thumbnailUrl: record.thumbnailUrl,
    originalFilename: record.originalFilename,
    mimeType: record.mimeType,
    durationSeconds: record.durationSeconds,
    height: record.height,
    failureReason: record.failureReason,
  };
}

export class MediaService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly videoProvider: VideoProvider,
  ) {}

  async getOwnVideo(userId: string) {
    const record = await this.repository.getVideoByUserId(userId);
    return record ? presentVideo(record) : null;
  }

  async startVideo(userId: string, input: unknown) {
    const value = candidateVideoStartSchema.parse(input);
    const previous = await this.repository.getVideoByUserId(userId);
    const asset = await this.videoProvider.createAsset({ title: `CVIDEO Introduction ${userId}` });

    const record = await this.repository.allocateVideoForUser(userId, {
      providerAssetId: asset.assetId,
      originalFilename: value.filename,
      mimeType: value.mimeType,
      durationSeconds: value.durationSeconds,
      height: value.height ?? null,
    });

    if (!record) {
      try {
        await this.videoProvider.deleteAsset(asset.assetId);
      } catch {
        // Cleanup is best effort. The original failure remains PROFILE_NOT_FOUND.
      }
      throw new MediaError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    }

    if (previous?.providerAssetId && previous.providerAssetId !== asset.assetId) {
      void this.videoProvider.deleteAsset(previous.providerAssetId).catch(() => undefined);
    }

    return {
      ...presentVideo(record),
      provider: this.videoProvider.name,
      uploadPath: '/api/v1/candidate/video/content',
      maxBytes: MAX_VIDEO_BYTES,
    };
  }

  async uploadVideo(
    userId: string,
    contentType: string | undefined,
    contentLength: number | undefined,
    body: unknown,
  ) {
    const record = await this.repository.getVideoByUserId(userId);
    if (!record?.providerAssetId || !record.mimeType) {
      throw new MediaError('VIDEO_NOT_STARTED', 409, 'Start the Introduction Video upload first');
    }
    if (record.status !== 'uploading') {
      throw new MediaError('VIDEO_NOT_STARTED', 409, 'Introduction Video is not waiting for upload');
    }

    const normalizedType = contentType?.split(';', 1)[0]?.trim().toLowerCase();
    if (!normalizedType || !ALLOWED_VIDEO_TYPES.has(normalizedType) || normalizedType !== record.mimeType) {
      throw new MediaError('VIDEO_INVALID', 422, 'Video content type does not match the upload session');
    }
    if (contentLength === undefined || !Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_VIDEO_BYTES) {
      throw new MediaError('VIDEO_INVALID', 422, 'A valid Content-Length up to 250 MB is required');
    }

    await this.videoProvider.uploadAsset(record.providerAssetId, body, contentLength);
    const updated = await this.repository.updateVideoForUser(userId, {
      status: 'processing',
      failureReason: null,
    });
    if (!updated) throw new MediaError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return presentVideo(updated);
  }

  async syncVideo(userId: string) {
    const record = await this.repository.getVideoByUserId(userId);
    if (!record?.providerAssetId) {
      throw new MediaError('VIDEO_NOT_STARTED', 409, 'No Introduction Video upload exists');
    }

    const snapshot = await this.videoProvider.getAsset(record.providerAssetId);
    if (snapshot.state === 'failed') {
      const failed = await this.repository.updateVideoForUser(userId, {
        status: 'failed',
        durationSeconds: snapshot.durationSeconds,
        height: snapshot.height,
        failureReason: snapshot.failureReason ?? 'Video processing failed',
      });
      if (!failed) throw new MediaError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
      return presentVideo(failed);
    }

    if (snapshot.state === 'ready') {
      if ((snapshot.durationSeconds ?? 0) > 30 || (snapshot.height ?? 0) > 720) {
        const rejected = await this.repository.updateVideoForUser(userId, {
          status: 'rejected',
          durationSeconds: snapshot.durationSeconds,
          height: snapshot.height,
          playbackUrl: null,
          thumbnailUrl: null,
          failureReason: 'Introduction Video must be 30 seconds or less and no higher than 720p',
        });
        if (!rejected) throw new MediaError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
        return presentVideo(rejected);
      }

      const ready = await this.repository.updateVideoForUser(userId, {
        status: 'ready',
        durationSeconds: snapshot.durationSeconds,
        height: snapshot.height,
        playbackUrl: snapshot.playbackUrl,
        thumbnailUrl: snapshot.thumbnailUrl,
        failureReason: null,
      });
      if (!ready) throw new MediaError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
      return presentVideo(ready);
    }

    const processing = await this.repository.updateVideoForUser(userId, {
      status: 'processing',
      durationSeconds: snapshot.durationSeconds,
      height: snapshot.height,
      failureReason: null,
    });
    if (!processing) throw new MediaError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return presentVideo(processing);
  }

  async deleteVideo(userId: string) {
    const record = await this.repository.getVideoByUserId(userId);
    if (!record) return;
    if (record.providerAssetId) {
      await this.videoProvider.deleteAsset(record.providerAssetId);
    }
    await this.repository.deleteVideoForUser(userId);
  }
}
