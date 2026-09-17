#!/usr/bin/env node
import fs from 'node:fs';

const baseUrl = (process.env.CVIDEO_QC_BASE_URL || '').replace(/\/$/, '');
const expected = (process.env.CVIDEO_QC_EXPECTED_SHA || process.env.GITHUB_SHA || '').trim();
const timeoutMs = Number(process.env.CVIDEO_QC_REVISION_TIMEOUT_MS || 180000);
const intervalMs = Number(process.env.CVIDEO_QC_REVISION_INTERVAL_MS || 5000);
if (!baseUrl) throw new Error('CVIDEO_QC_BASE_URL is required');
if (!/^[a-f0-9]{40}$/i.test(expected)) throw new Error('Expected deployment SHA must be a full 40-character Git SHA');
const deadline = Date.now() + timeoutMs;
let last = null;
let error = null;
while (Date.now() < deadline) {
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`health returned ${response.status}`);
    last = await response.json();
    if (last.revision === expected) break;
    error = `expected ${expected}, deployed ${last.revision || 'unknown'}`;
  } catch (e) { error = e instanceof Error ? e.message : String(e); }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
const passed = last?.revision === expected;
const evidence = { schemaVersion: 1, baseUrl, expectedSha: expected, deployedSha: last?.revision ?? null, passed, error: passed ? null : error, checkedAt: new Date().toISOString() };
fs.mkdirSync('qc-evidence', { recursive: true });
fs.writeFileSync('qc-evidence/deployed-revision.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (!passed) process.exit(1);
