import { describe, expect, it } from 'vitest';
import type { CandidateVideoStatus } from '@cvideo/types';
import type {
  CandidateVideoAllocationInput,
  CandidateVideoMediaRecord,
  CandidateVideoProviderUpdate,
  MediaRepository,
} from './repository.js';
import type {
  VideoProvider,
  VideoProviderAsset,
  VideoProviderCreateInput,
  VideoProviderSnapshot,
} from './provider.js';
import { MediaService } from './service.js';

class MemoryMediaRepository implements MediaRepository {
  record: CandidateVideoMediaRecord | null = null;
  userExists = true;

  async getVideoByUserId(_userId: string) {
    return this.record;
  }

  async allocateVideoForUser(_userId: string, input: CandidateVideoAllocationInput) {
    if (!this.userExists) return null;
    this.record = {
      id: 'video-1',
      candidateId: 'candidate-1',
      status: 'uploading',
      providerAssetId: input.providerAssetId,
      playbackUrl: null,
      thumbnailUrl: null,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      durationSeconds: input.durationSeconds,
      height: input.height,
      failureReason: null,
    };
    return this.record;
  }

  async updateVideoForUser(_userId: string, update: CandidateVideoProviderUpdate) {
    if (!this.record) return null;
    this.record = {
      ...this.record,
      status: update.status,
      playbackUrl: 'playbackUrl' in update ? update.playbackUrl ?? null : this.record.playbackUrl,
      thumbnailUrl: 'thumbnailUrl' in update ? update.thumbnailUrl ?? null : this.record.thumbnailUrl,
      durationSeconds: 'durationSeconds' in update ? update.durationSeconds ?? null : this.record.durationSeconds,
      height: 'height' in update ? update.height ?? null : this.record.height,
      failureReason: 'failureReason' in update ? update.failureReason ?? null : this.record.failureReason,
    };
    return this.record;
  }

  async deleteVideoForUser(_userId: string) {
    const existed = Boolean(this.record);
    this.record = null;
    return existed;
  }
}

class FakeVideoProvider implements VideoProvider {
  readonly name = 'fake';
  snapshot: VideoProviderSnapshot = {
    assetId: 'asset-1',
    state: 'processing',
    durationSeconds: null,
    height: null,
    playbackUrl: null,
    thumbnailUrl: null,
    failureReason: null,
  };
  uploaded = false;
  deleted: string[] = [];

  async createAsset(_input: VideoProviderCreateInput): Promise<VideoProviderAsset> {
    return { assetId: 'asset-1' };
  }

  async uploadAsset(_assetId: string, _body: unknown, _contentLength?: number) {
    this.uploaded = true;
  }

  async getAsset(_assetId: string) {
    return this.snapshot;
  }

  async deleteAsset(assetId: string) {
    this.deleted.push(assetId);
  }
}

function startPayload(durationSeconds = 30, height = 720) {
  return {
    filename: 'intro.mp4',
    mimeType: 'video/mp4' as const,
    sizeBytes: 1024,
    durationSeconds,
    height,
  };
}

describe('MediaService', () => {
  it('runs start -> upload -> processing -> ready without exposing provider asset IDs', async () => {
    const repository = new MemoryMediaRepository();
    const provider = new FakeVideoProvider();
    const service = new MediaService(repository, provider);

    const started = await service.startVideo('user-1', startPayload());
    expect(started.status).toBe('uploading');
    expect(started).not.toHaveProperty('providerAssetId');
    expect(repository.record?.providerAssetId).toBe('asset-1');

    const uploaded = await service.uploadVideo('user-1', 'video/mp4', 1024, Buffer.from('video'));
    expect(provider.uploaded).toBe(true);
    expect(uploaded.status).toBe('processing');

    provider.snapshot = {
      assetId: 'asset-1',
      state: 'ready',
      durationSeconds: 30,
      height: 720,
      playbackUrl: 'https://cdn.example/asset-1/playlist.m3u8',
      thumbnailUrl: 'https://cdn.example/asset-1/thumb.jpg',
      failureReason: null,
    };
    const ready = await service.syncVideo('user-1');
    expect(ready.status).toBe('ready');
    expect(ready.playbackUrl).toContain('playlist.m3u8');
    expect(ready).not.toHaveProperty('providerAssetId');
  });

  it('rejects upload metadata above CVIDEO duration or height limits', async () => {
    const service = new MediaService(new MemoryMediaRepository(), new FakeVideoProvider());
    await expect(service.startVideo('user-1', startPayload(31, 720))).rejects.toBeDefined();
    await expect(service.startVideo('user-1', startPayload(30, 1080))).rejects.toBeDefined();
  });

  it('rejects provider results that violate the 30-second boundary', async () => {
    const repository = new MemoryMediaRepository();
    const provider = new FakeVideoProvider();
    const service = new MediaService(repository, provider);
    await service.startVideo('user-1', startPayload());
    await service.uploadVideo('user-1', 'video/mp4', 1024, Buffer.from('video'));

    provider.snapshot = {
      assetId: 'asset-1',
      state: 'ready',
      durationSeconds: 35,
      height: 720,
      playbackUrl: 'https://cdn.example/asset-1/playlist.m3u8',
      thumbnailUrl: null,
      failureReason: null,
    };

    const result = await service.syncVideo('user-1');
    expect(result.status satisfies CandidateVideoStatus).toBe('rejected');
    expect(result.playbackUrl).toBeNull();
  });

  it('requires a bounded content length and matching MIME type', async () => {
    const repository = new MemoryMediaRepository();
    const provider = new FakeVideoProvider();
    const service = new MediaService(repository, provider);
    await service.startVideo('user-1', startPayload());

    await expect(service.uploadVideo('user-1', 'video/webm', 1024, Buffer.from('video'))).rejects.toMatchObject({
      code: 'VIDEO_INVALID',
    });
    await expect(service.uploadVideo('user-1', 'video/mp4', undefined, Buffer.from('video'))).rejects.toMatchObject({
      code: 'VIDEO_INVALID',
    });
  });
});
