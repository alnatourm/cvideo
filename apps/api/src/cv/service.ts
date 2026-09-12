import { randomUUID } from 'node:crypto';
import { candidateCvUploadSchema } from '@cvideo/validation';
import { z } from 'zod';
import { CvError } from './errors.js';
import type { DocumentProvider, StoredDocument } from './provider.js';
import type { CandidateCvRecord, CvRepository } from './repository.js';

export interface CvDownload extends StoredDocument {
  filename: string;
}

function metadata(record: CandidateCvRecord) {
  return { filename: record.originalFilename };
}

function filenameFromHeader(value: string | undefined) {
  if (!value) return '';
  try { return decodeURIComponent(value); } catch { return value; }
}

function validateUpload(filenameHeader: string | undefined, mimeType: string | undefined, sizeBytes: number | undefined) {
  const filename = filenameFromHeader(filenameHeader).replaceAll('\\', '/').split('/').at(-1) ?? '';
  const parsed = candidateCvUploadSchema.safeParse({ filename, mimeType, sizeBytes });
  if (!parsed.success || !parsed.data.filename.toLowerCase().endsWith('.pdf') || /[\u0000-\u001f\u007f]/.test(parsed.data.filename)) {
    throw new CvError('CV_INVALID', 400, 'CV must be a PDF no larger than 10 MB with a valid filename');
  }
  return parsed.data;
}

async function* verifiedPdf(body: AsyncIterable<Uint8Array>) {
  const leading: Uint8Array[] = [];
  let leadingBytes = 0;
  for await (const chunk of body) {
    if (leadingBytes < 5) {
      leading.push(chunk);
      leadingBytes += chunk.byteLength;
      if (leadingBytes < 5) continue;
      const buffered = Buffer.concat(leading);
      if (buffered.subarray(0, 5).toString('ascii') !== '%PDF-') {
        throw new CvError('CV_INVALID', 400, 'CV content is not a valid PDF');
      }
      yield buffered;
      continue;
    }
    yield chunk;
  }
  if (leadingBytes < 5) throw new CvError('CV_INVALID', 400, 'CV content is not a valid PDF');
}

export class CvService {
  constructor(private readonly repository: CvRepository, private readonly provider: DocumentProvider) {}

  async getOwn(userId: string) {
    const record = await this.repository.getByUserId(userId);
    if (!record) throw new CvError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    return metadata(record);
  }

  async uploadOwn(userId: string, filename: string | undefined, mimeType: string | undefined, sizeBytes: number | undefined, body: AsyncIterable<Uint8Array>) {
    const upload = validateUpload(filename, mimeType, sizeBytes);
    const current = await this.repository.getByUserId(userId);
    if (!current) throw new CvError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');

    const storageKey = `candidate-cv/${current.candidateId}/${randomUUID()}.pdf`;
    await this.provider.putObject(storageKey, verifiedPdf(body), upload.sizeBytes);
    const saved = await this.repository.setByUserId(userId, storageKey, upload.filename);
    if (!saved) {
      await this.provider.deleteObject(storageKey).catch(() => undefined);
      throw new CvError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    }
    if (current.storageKey && current.storageKey !== storageKey) {
      await this.provider.deleteObject(current.storageKey).catch(() => undefined);
    }
    return metadata(saved);
  }

  async downloadOwn(userId: string): Promise<CvDownload> {
    const record = await this.repository.getByUserId(userId);
    return this.download(record);
  }

  async downloadForRecruiter(candidateId: string): Promise<CvDownload> {
    const parsed = z.string().uuid().safeParse(candidateId);
    if (!parsed.success) throw new CvError('CV_NOT_FOUND', 404, 'CV not found');
    const record = await this.repository.getDiscoverableByCandidateId(parsed.data);
    return this.download(record);
  }

  async deleteOwn(userId: string) {
    const record = await this.repository.clearByUserId(userId);
    if (!record) throw new CvError('PROFILE_NOT_FOUND', 404, 'Candidate profile not found');
    if (record.storageKey) await this.provider.deleteObject(record.storageKey);
  }

  private async download(record: CandidateCvRecord | null): Promise<CvDownload> {
    if (!record?.storageKey || !record.originalFilename) throw new CvError('CV_NOT_FOUND', 404, 'CV not found');
    const stored = await this.provider.getObject(record.storageKey);
    return { ...stored, filename: record.originalFilename };
  }
}
