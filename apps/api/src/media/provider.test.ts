import { describe, expect, it, vi } from 'vitest';
import { BunnyStreamVideoProvider } from './provider.js';

describe('BunnyStreamVideoProvider', () => {
  it('marks a video ready when Bunny has finished a playable resolution', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      guid: 'asset-1',
      status: 4,
      length: 9,
      width: 720,
      height: 1280,
      thumbnailFileName: 'thumbnail.jpg',
    }), { status: 200 })) as unknown as typeof fetch;
    const provider = new BunnyStreamVideoProvider({
      libraryId: 'library-1',
      apiKey: 'secret',
      cdnHostname: 'video.example.test',
    }, fetchImpl);

    await expect(provider.getAsset('asset-1')).resolves.toMatchObject({
      state: 'ready',
      durationSeconds: 9,
      height: 720,
      playbackUrl: 'https://video.example.test/asset-1/playlist.m3u8',
      thumbnailUrl: 'https://video.example.test/asset-1/thumbnail.jpg',
    });
  });

  it('keeps encoding states processing and maps failures', async () => {
    const response = (status: number) => vi.fn(async () => new Response(JSON.stringify({ guid: 'asset-1', status }), { status: 200 })) as unknown as typeof fetch;
    const config = { libraryId: 'library-1', apiKey: 'secret', cdnHostname: 'video.example.test' };

    await expect(new BunnyStreamVideoProvider(config, response(2)).getAsset('asset-1')).resolves.toMatchObject({ state: 'processing' });
    await expect(new BunnyStreamVideoProvider(config, response(5)).getAsset('asset-1')).resolves.toMatchObject({ state: 'failed' });
  });
});
