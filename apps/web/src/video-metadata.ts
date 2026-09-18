export interface VideoMetadata {
  durationSeconds: number;
  height: number;
}

const MAX_BOX_HEADER_BYTES = 16;
const MAX_MOOV_BYTES = 32 * 1024 * 1024;

function readType(view: DataView, offset: number) {
  return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}

function readBoxSize(view: DataView, offset: number) {
  const size32 = view.getUint32(offset);
  if (size32 === 1) {
    const size64 = view.getBigUint64(offset + 8);
    if (size64 > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Video metadata is too large');
    return { size: Number(size64), headerSize: 16 };
  }
  return { size: size32, headerSize: 8 };
}

function childBoxes(view: DataView, start: number, end: number) {
  const boxes: Array<{ type: string; end: number; dataStart: number }> = [];
  let offset = start;
  while (offset + 8 <= end) {
    const type = readType(view, offset + 4);
    const parsed = readBoxSize(view, offset);
    const size = parsed.size || end - offset;
    if (size < parsed.headerSize || offset + size > end) break;
    boxes.push({ type, end: offset + size, dataStart: offset + parsed.headerSize });
    offset += size;
  }
  return boxes;
}

function parseMovieMetadata(buffer: ArrayBuffer): VideoMetadata {
  const view = new DataView(buffer);
  const moovChildren = childBoxes(view, 0, view.byteLength);
  const mvhd = moovChildren.find((box) => box.type === 'mvhd');
  if (!mvhd) throw new Error('Missing movie timing metadata');

  const version = view.getUint8(mvhd.dataStart);
  const timescaleOffset = mvhd.dataStart + (version === 1 ? 20 : 12);
  const durationOffset = timescaleOffset + 4;
  const timescale = view.getUint32(timescaleOffset);
  const duration = version === 1 ? Number(view.getBigUint64(durationOffset)) : view.getUint32(durationOffset);
  if (!timescale || !Number.isFinite(duration)) throw new Error('Invalid movie timing metadata');

  let resolution = 0;
  for (const trak of moovChildren.filter((box) => box.type === 'trak')) {
    const children = childBoxes(view, trak.dataStart, trak.end);
    const tkhd = children.find((box) => box.type === 'tkhd');
    const mdia = children.find((box) => box.type === 'mdia');
    if (!tkhd || !mdia) continue;
    const hdlr = childBoxes(view, mdia.dataStart, mdia.end).find((box) => box.type === 'hdlr');
    if (!hdlr || readType(view, hdlr.dataStart + 8) !== 'vide') continue;
    const width = view.getUint32(tkhd.end - 8) / 65536;
    const height = view.getUint32(tkhd.end - 4) / 65536;
    resolution = Math.round(Math.min(width, height));
    break;
  }

  if (!resolution) throw new Error('Missing video dimensions');
  return { durationSeconds: Math.ceil(duration / timescale), height: resolution };
}

async function readBoxHeader(file: Blob, offset: number) {
  const header = await file.slice(offset, offset + MAX_BOX_HEADER_BYTES).arrayBuffer();
  if (header.byteLength < 8) return null;
  const view = new DataView(header);
  return { type: readType(view, 4), ...readBoxSize(view, 0) };
}

export async function inspectIsoBmffVideo(file: Blob): Promise<VideoMetadata> {
  let offset = 0;
  while (offset + 8 <= file.size) {
    const box = await readBoxHeader(file, offset);
    if (!box) break;
    const size = box.size || file.size - offset;
    if (size < box.headerSize || offset + size > file.size) throw new Error('Invalid video container');
    if (box.type === 'moov') {
      if (size > MAX_MOOV_BYTES) throw new Error('Video metadata is too large');
      const payload = await file.slice(offset + box.headerSize, offset + size).arrayBuffer();
      return parseMovieMetadata(payload);
    }
    offset += size;
  }
  throw new Error('Missing MP4/MOV metadata');
}

export function normalizeVideoMimeType(file: Pick<File, 'name' | 'type'>) {
  const declared = file.type.toLowerCase().split(';', 1)[0]?.trim();
  if (declared === 'video/mp4' || declared === 'video/webm' || declared === 'video/quicktime') return declared;
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'webm') return 'video/webm';
  throw new Error('Unsupported video format');
}

export async function inspectVideo(file: File): Promise<VideoMetadata> {
  try {
    return await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      const cleanup = () => URL.revokeObjectURL(url);
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const height = Math.min(video.videoWidth, video.videoHeight);
        const metadata = { durationSeconds: Math.ceil(video.duration), height };
        cleanup();
        if (!Number.isFinite(metadata.durationSeconds) || !height) reject(new Error('Unreadable video metadata'));
        else resolve(metadata);
      };
      video.onerror = () => { cleanup(); reject(new Error('Browser cannot decode video')); };
      video.src = url;
    });
  } catch {
    const mimeType = normalizeVideoMimeType(file);
    if (mimeType === 'video/webm') throw new Error('Could not read video metadata');
    return inspectIsoBmffVideo(file);
  }
}
