import { describe, expect, it } from 'vitest';
import { prepareVideoAsset } from './video-upload';

const valid = {
  uri: 'file:///intro.mp4', fileName: 'intro.mp4', fileSize: 5_000_000,
  mimeType: 'video/mp4', duration: 30_000, width: 720, height: 1280, type: 'video',
};

describe('prepareVideoAsset', () => {
  it('accepts a portrait 720p video at 30 seconds', () => {
    expect(prepareVideoAsset(valid)).toMatchObject({ durationSeconds: 30, resolution: 720, mimeType: 'video/mp4' });
  });

  it('rejects excessive duration, resolution, and size', () => {
    expect(() => prepareVideoAsset({ ...valid, duration: 31_000 })).toThrow('30 seconds');
    expect(() => prepareVideoAsset({ ...valid, width: 1080, height: 1920 })).toThrow('720p');
    expect(() => prepareVideoAsset({ ...valid, fileSize: 251 * 1024 * 1024 })).toThrow('250 MB');
  });

  it('infers QuickTime MIME type for an iOS MOV asset', () => {
    expect(prepareVideoAsset({ ...valid, fileName: 'intro.mov', mimeType: null }).mimeType).toBe('video/quicktime');
  });
});
