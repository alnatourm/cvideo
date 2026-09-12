import { createReadStream } from 'node:fs';
import { mkdir, open, rename, rm, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { CvError } from './errors.js';

export interface StoredDocument {
  body: AsyncIterable<Uint8Array>;
  sizeBytes: number;
}

export interface DocumentProvider {
  putObject(storageKey: string, body: AsyncIterable<Uint8Array>, expectedBytes: number): Promise<void>;
  getObject(storageKey: string): Promise<StoredDocument>;
  deleteObject(storageKey: string): Promise<void>;
}

export class FilesystemDocumentProvider implements DocumentProvider {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private pathFor(storageKey: string) {
    if (!/^[a-z0-9][a-z0-9/_-]*\.pdf$/.test(storageKey)) {
      throw new CvError('DOCUMENT_PROVIDER_ERROR', 502, 'Document storage rejected the object key');
    }
    const path = resolve(this.root, storageKey);
    if (!path.startsWith(`${this.root}${sep}`)) {
      throw new CvError('DOCUMENT_PROVIDER_ERROR', 502, 'Document storage rejected the object key');
    }
    return path;
  }

  async putObject(storageKey: string, body: AsyncIterable<Uint8Array>, expectedBytes: number) {
    const destination = this.pathFor(storageKey);
    const temporary = `${destination}.uploading`;
    await mkdir(dirname(destination), { recursive: true });
    const file = await open(temporary, 'w', 0o600);
    let written = 0;
    try {
      for await (const chunk of body) {
        written += chunk.byteLength;
        if (written > expectedBytes) throw new CvError('CV_INVALID', 400, 'CV body exceeds the declared size');
        await file.write(chunk);
      }
      if (written !== expectedBytes) throw new CvError('CV_INVALID', 400, 'CV body does not match the declared size');
      await file.close();
      await rename(temporary, destination);
    } catch (error) {
      await file.close().catch(() => undefined);
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async getObject(storageKey: string): Promise<StoredDocument> {
    const path = this.pathFor(storageKey);
    try {
      const metadata = await stat(path);
      return { body: createReadStream(path), sizeBytes: metadata.size };
    } catch {
      throw new CvError('CV_NOT_FOUND', 404, 'CV not found');
    }
  }

  async deleteObject(storageKey: string) {
    await rm(this.pathFor(storageKey), { force: true });
  }
}

export class DeferredDocumentProvider implements DocumentProvider {
  private unavailable(): never {
    throw new CvError('DOCUMENT_PROVIDER_NOT_CONFIGURED', 503, 'Private CV document storage is not configured');
  }
  async putObject(): Promise<void> { this.unavailable(); }
  async getObject(): Promise<StoredDocument> { return this.unavailable(); }
  async deleteObject(): Promise<void> { this.unavailable(); }
}
