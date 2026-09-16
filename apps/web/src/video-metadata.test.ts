import { describe, expect, it } from 'vitest';
import { inspectIsoBmffVideo, normalizeVideoMimeType } from './video-metadata';

function box(type: string, payload: Uint8Array) {
  const output = new Uint8Array(8 + payload.length);
  const view = new DataView(output.buffer);
  view.setUint32(0, output.length);
  for (let index = 0; index < 4; index += 1) output[4 + index] = type.charCodeAt(index);
  output.set(payload, 8);
  return output;
}

function concat(...parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function testMovie() {
  const mvhd = new Uint8Array(24);
  const mvhdView = new DataView(mvhd.buffer);
  mvhdView.setUint32(12, 1000);
  mvhdView.setUint32(16, 29_100);

  const tkhd = new Uint8Array(84);
  const tkhdView = new DataView(tkhd.buffer);
  tkhdView.setUint32(76, 720 * 65536);
  tkhdView.setUint32(80, 1280 * 65536);

  const hdlr = new Uint8Array(12);
  hdlr.set([118, 105, 100, 101], 8);
  return new Blob([box('ftyp', new Uint8Array(8)), box('moov', concat(
    box('mvhd', mvhd),
    box('trak', concat(box('tkhd', tkhd), box('mdia', box('hdlr', hdlr)))),
  ))]);
}

describe('video metadata fallback', () => {
  it('reads MP4 timing and portrait 720p dimensions without decoding the codec', async () => {
    await expect(inspectIsoBmffVideo(testMovie())).resolves.toEqual({ durationSeconds: 30, height: 720 });
  });

  it('normalizes common video MIME types from the filename', () => {
    expect(normalizeVideoMimeType({ name: 'intro.MOV', type: '' })).toBe('video/quicktime');
    expect(normalizeVideoMimeType({ name: 'intro.m4v', type: 'application/octet-stream' })).toBe('video/mp4');
  });
});
