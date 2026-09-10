import { MediaError } from './errors.js';

export interface VideoProviderCreateInput {
  title: string;
}

export interface VideoProviderAsset {
  assetId: string;
}

export interface VideoProviderSnapshot {
  assetId: string;
  state: 'processing' | 'ready' | 'failed';
  durationSeconds: number | null;
  height: number | null;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  failureReason: string | null;
}

export interface VideoProvider {
  readonly name: string;
  createAsset(input: VideoProviderCreateInput): Promise<VideoProviderAsset>;
  uploadAsset(assetId: string, body: unknown, contentLength?: number): Promise<void>;
  getAsset(assetId: string): Promise<VideoProviderSnapshot>;
  deleteAsset(assetId: string): Promise<void>;
}

export class DeferredVideoProvider implements VideoProvider {
  readonly name = 'unconfigured';

  private unavailable(): never {
    throw new MediaError('MEDIA_PROVIDER_NOT_CONFIGURED', 503, 'Video provider is not configured');
  }

  async createAsset(_input: VideoProviderCreateInput): Promise<VideoProviderAsset> {
    return this.unavailable();
  }

  async uploadAsset(_assetId: string, _body: unknown, _contentLength?: number): Promise<void> {
    return this.unavailable();
  }

  async getAsset(_assetId: string): Promise<VideoProviderSnapshot> {
    return this.unavailable();
  }

  async deleteAsset(_assetId: string): Promise<void> {
    return this.unavailable();
  }
}

interface BunnyVideoResponse {
  guid?: string;
  length?: number;
  status?: number;
  height?: number;
  thumbnailFileName?: string | null;
  transcodingMessages?: Array<{ message?: string | null }> | null;
}

export interface BunnyStreamConfig {
  libraryId: string;
  apiKey: string;
  cdnHostname: string;
}

type FetchLike = typeof fetch;

export class BunnyStreamVideoProvider implements VideoProvider {
  readonly name = 'bunny_stream';
  private readonly apiBase: string;
  private readonly cdnBase: string;

  constructor(
    private readonly config: BunnyStreamConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.apiBase = `https://video.bunnycdn.com/library/${encodeURIComponent(config.libraryId)}/videos`;
    this.cdnBase = `https://${config.cdnHostname.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }

  private async request(url: string, init: RequestInit & { duplex?: 'half' }) {
    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch {
      throw new MediaError('MEDIA_PROVIDER_ERROR', 502, 'Video provider request failed');
    }
    if (!response.ok) {
      throw new MediaError('MEDIA_PROVIDER_ERROR', 502, `Video provider returned ${response.status}`);
    }
    return response;
  }

  async createAsset(input: VideoProviderCreateInput): Promise<VideoProviderAsset> {
    const response = await this.request(this.apiBase, {
      method: 'POST',
      headers: {
        AccessKey: this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: input.title }),
    });
    const data = (await response.json()) as BunnyVideoResponse;
    if (!data.guid) throw new MediaError('MEDIA_PROVIDER_ERROR', 502, 'Video provider did not return an asset ID');
    return { assetId: data.guid };
  }

  async uploadAsset(assetId: string, body: unknown, contentLength?: number): Promise<void> {
    const url = new URL(`${this.apiBase}/${encodeURIComponent(assetId)}`);
    url.searchParams.set('enabledResolutions', '240p,360p,480p,720p');
    url.searchParams.set('transcribeEnabled', 'false');
    const headers: Record<string, string> = {
      AccessKey: this.config.apiKey,
      'Content-Type': 'application/octet-stream',
    };
    if (contentLength !== undefined) headers['Content-Length'] = String(contentLength);

    await this.request(url.toString(), {
      method: 'PUT',
      headers,
      body: body as BodyInit,
      duplex: 'half',
    });
  }

  async getAsset(assetId: string): Promise<VideoProviderSnapshot> {
    const response = await this.request(`${this.apiBase}/${encodeURIComponent(assetId)}`, {
      method: 'GET',
      headers: { AccessKey: this.config.apiKey },
    });
    const data = (await response.json()) as BunnyVideoResponse;
    const status = data.status ?? 0;
    const state: VideoProviderSnapshot['state'] = status === 3 ? 'ready' : status === 5 || status === 8 ? 'failed' : 'processing';
    const thumbnailUrl = data.thumbnailFileName
      ? `${this.cdnBase}/${encodeURIComponent(assetId)}/${encodeURIComponent(data.thumbnailFileName)}`
      : null;
    const failureReason =
      state === 'failed'
        ? data.transcodingMessages?.map((message) => message.message).filter(Boolean).join('; ') || 'Video processing failed'
        : null;

    return {
      assetId,
      state,
      durationSeconds: Number.isFinite(data.length) ? Number(data.length) : null,
      height: Number.isFinite(data.height) ? Number(data.height) : null,
      playbackUrl: state === 'ready' ? `${this.cdnBase}/${encodeURIComponent(assetId)}/playlist.m3u8` : null,
      thumbnailUrl,
      failureReason,
    };
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.request(`${this.apiBase}/${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
      headers: { AccessKey: this.config.apiKey },
    });
  }
}
