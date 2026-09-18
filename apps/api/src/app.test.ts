import request from 'supertest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('CVIDEO API foundation', () => {
  it('returns the v1 health response used by deployment, QC, and autonomous Factory readiness checks', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'cvideo-api', version: 'v1' });
  });

  it('exposes the deployed revision when supplied for Factory QC proof', async () => {
    const revision = '72b24b8cd47341815f993bbeb6604826b19da076';
    const response = await request(createApp({ deployedRevision: revision })).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'cvideo-api', version: 'v1', revision });
  });

  it('allows the Bunny Stream player in the content security policy', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.headers['content-security-policy']).toContain("frame-src 'self' https://iframe.mediadelivery.net");
  });

  it('returns the canonical error envelope for unknown routes', async () => {
    const response = await request(createApp()).get('/api/v1/unknown');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('uses an explicit proxy-hop count when deployed behind a trusted ingress', () => {
    const app = createApp({ trustProxyHops: 1 });
    expect(app.get('trust proxy')).toBe(1);
  });

  it('serves the web shell for client-side routes without masking API 404s', async () => {
    const webDirectory = await mkdtemp(join(tmpdir(), 'cvideo-web-'));
    await writeFile(join(webDirectory, 'index.html'), '<!doctype html><title>CVIDEO shell</title>');
    try {
      expect(() => createApp({ webDistDirectory: webDirectory })).not.toThrow();
      const webResponse = await request(createApp({ webDistDirectory: webDirectory })).get('/en/company/search');
      expect(webResponse.status).toBe(200);
      expect(webResponse.text).toContain('CVIDEO shell');
      const apiResponse = await request(createApp({ webDistDirectory: webDirectory })).get('/api/v1/unknown');
      expect(apiResponse.status).toBe(404);
      expect(apiResponse.body.error.code).toBe('NOT_FOUND');
      const postResponse = await request(createApp({ webDistDirectory: webDirectory })).post('/en/company/search');
      expect(postResponse.status).toBe(404);
      expect(postResponse.body.error.code).toBe('NOT_FOUND');
    } finally {
      await rm(webDirectory, { recursive: true, force: true });
    }
  });
});
