import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

describe('CVIDEO API foundation', () => {
  it('returns the v1 health response', async () => {
    const response = await request(createApp()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'cvideo-api', version: 'v1' });
  });

  it('returns the canonical error envelope for unknown routes', async () => {
    const response = await request(createApp()).get('/api/v1/unknown');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
