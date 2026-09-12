import { describe, expect, it } from 'vitest';
import type { DocumentProvider, StoredDocument } from './provider.js';
import type { CandidateCvRecord, CvRepository } from './repository.js';
import { CvService } from './service.js';

class MemoryCvRepository implements CvRepository {
  record: CandidateCvRecord | null = { candidateId: 'candidate-1', storageKey: null, originalFilename: null };
  discoverable = true;

  async getByUserId() { return this.record; }
  async getDiscoverableByCandidateId() { return this.discoverable ? this.record : null; }
  async setByUserId(_userId: string, storageKey: string, originalFilename: string) {
    if (!this.record) return null;
    this.record = { ...this.record, storageKey, originalFilename };
    return this.record;
  }
  async clearByUserId() {
    if (!this.record) return null;
    const previous = this.record;
    this.record = { ...this.record, storageKey: null, originalFilename: null };
    return previous;
  }
}

class MemoryDocumentProvider implements DocumentProvider {
  objects = new Map<string, Uint8Array>();
  async putObject(key: string, body: AsyncIterable<Uint8Array>, expectedBytes: number) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of body) chunks.push(chunk);
    const data = Buffer.concat(chunks);
    if (data.byteLength !== expectedBytes) throw new Error('size mismatch');
    this.objects.set(key, data);
  }
  async getObject(key: string): Promise<StoredDocument> {
    const data = this.objects.get(key);
    if (!data) throw new Error('missing');
    return { body: (async function* () { yield data; })(), sizeBytes: data.byteLength };
  }
  async deleteObject(key: string) { this.objects.delete(key); }
}

const pdf = Buffer.from('%PDF-1.7\nprivate test document');

describe('CvService', () => {
  it('uploads and downloads a private PDF without exposing its storage key', async () => {
    const repository = new MemoryCvRepository();
    const provider = new MemoryDocumentProvider();
    const service = new CvService(repository, provider);

    const uploaded = await service.uploadOwn('user-1', 'resume.pdf', 'application/pdf', pdf.byteLength, (async function* () { yield pdf; })());
    expect(uploaded).toEqual({ filename: 'resume.pdf' });
    expect(uploaded).not.toHaveProperty('storageKey');

    const download = await service.downloadOwn('user-1');
    expect(download.filename).toBe('resume.pdf');
    expect(download.sizeBytes).toBe(pdf.byteLength);
  });

  it('rejects disguised files and invalid upload metadata', async () => {
    const service = new CvService(new MemoryCvRepository(), new MemoryDocumentProvider());
    const fake = Buffer.from('not a pdf');
    await expect(service.uploadOwn('user-1', 'resume.pdf', 'application/pdf', fake.byteLength, (async function* () { yield fake; })())).rejects.toMatchObject({ code: 'CV_INVALID' });
    await expect(service.uploadOwn('user-1', 'resume.txt', 'application/pdf', pdf.byteLength, (async function* () { yield pdf; })())).rejects.toMatchObject({ code: 'CV_INVALID' });
  });

  it('blocks recruiter download when the candidate is not discoverable', async () => {
    const repository = new MemoryCvRepository();
    repository.discoverable = false;
    const service = new CvService(repository, new MemoryDocumentProvider());
    await expect(service.downloadForRecruiter('candidate-1')).rejects.toMatchObject({ code: 'CV_NOT_FOUND', status: 404 });
  });

  it('deletes the database reference and private object', async () => {
    const repository = new MemoryCvRepository();
    const provider = new MemoryDocumentProvider();
    const service = new CvService(repository, provider);
    await service.uploadOwn('user-1', 'resume.pdf', 'application/pdf', pdf.byteLength, (async function* () { yield pdf; })());
    expect(provider.objects.size).toBe(1);
    await service.deleteOwn('user-1');
    expect(provider.objects.size).toBe(0);
    expect(repository.record?.storageKey).toBeNull();
  });
});
