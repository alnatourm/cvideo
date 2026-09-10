import { describe, expect, it, vi } from 'vitest';
import type { MediaProvider } from './media-provider.js';
import { VideoService } from './video-service.js';

function fakeProvider(): MediaProvider {
  return {
    createUploadIntent: vi.fn(async () => ({
      storageKey: 'candidate/video/object.mp4',
      uploadUrl: 'https://upload.invalid/object',
      expiresAt: '2030-01-01T00:00:00.000Z',
    })),
    getPlaybackAsset: vi.fn(async () => ({ playbackUrl: 'https://play.invalid/object' })),
    deleteObject: vi.fn(async () => undefined),
  };
}

describe('VideoService', () => {
  it('creates provider-neutral introduction upload intents', async () => {
    const provider = fakeProvider();
    const service = new VideoService(provider);

    const intent = await service.createIntroductionUploadIntent({
      candidateId: '00000000-0000-4000-8000-000000000001',
      filename: 'intro.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 12_000_000,
    });

    expect(intent.storageKey).toBe('candidate/video/object.mp4');
    expect(provider.createUploadIntent).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'candidate_intro_video' }),
    );
  });

  it('rejects video completion metadata above 30 seconds or 720p', () => {
    const service = new VideoService(fakeProvider());

    expect(() =>
      service.validateCompletedIntroduction({
        durationSeconds: 31,
        height: 720,
        mimeType: 'video/mp4',
        sizeBytes: 10_000_000,
      }),
    ).toThrow();

    expect(() =>
      service.validateCompletedIntroduction({
        durationSeconds: 30,
        height: 1080,
        mimeType: 'video/mp4',
        sizeBytes: 10_000_000,
      }),
    ).toThrow();
  });
});
