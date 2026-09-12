export const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export interface PickedVideoAsset {
  uri: string;
  fileName?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  duration?: number | null;
  width: number;
  height: number;
  type?: string | null;
}

export interface PreparedVideo {
  uri: string;
  filename: string;
  mimeType: 'video/mp4' | 'video/webm' | 'video/quicktime';
  sizeBytes: number;
  durationSeconds: number;
  resolution: number;
}

function inferredMimeType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  return null;
}

export function prepareVideoAsset(asset: PickedVideoAsset): PreparedVideo {
  if (asset.type && asset.type !== 'video') throw new Error('Please choose a video file.');
  const filename = asset.fileName?.trim() || `introduction-${Date.now()}.mp4`;
  const mimeType = (asset.mimeType?.toLowerCase() || inferredMimeType(filename)) as PreparedVideo['mimeType'] | null;
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) throw new Error('Use an MP4, MOV, or WebM video.');
  if (!asset.fileSize || asset.fileSize <= 0) throw new Error('The selected video size could not be verified.');
  if (asset.fileSize > MAX_VIDEO_BYTES) throw new Error('The Introduction Video must be 250 MB or smaller.');
  if (!asset.duration || asset.duration <= 0) throw new Error('The selected video duration could not be verified.');
  const durationSeconds = asset.duration / 1000;
  if (durationSeconds > 30.05) throw new Error('The Introduction Video must be 30 seconds or less.');
  if (asset.width <= 0 || asset.height <= 0) throw new Error('The selected video resolution could not be verified.');
  const resolution = Math.min(asset.width, asset.height);
  if (resolution > 720) throw new Error('Choose or record a video at 720p or lower.');
  return { uri: asset.uri, filename, mimeType, sizeBytes: asset.fileSize, durationSeconds: Math.min(30, durationSeconds), resolution };
}
