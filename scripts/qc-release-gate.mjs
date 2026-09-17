#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const requiredAuth = process.env.CVIDEO_QC_REQUIRE_AUTH === 'true';
const authConfigured = ['CVIDEO_QC_CANDIDATE_EMAIL','CVIDEO_QC_CANDIDATE_PASSWORD','CVIDEO_QC_RECRUITER_EMAIL','CVIDEO_QC_RECRUITER_PASSWORD'].every((key) => Boolean(process.env[key]));
const testedSha = process.env.GITHUB_SHA || process.env.CVIDEO_QC_EXPECTED_SHA || 'unknown';
const baseUrl = process.env.CVIDEO_QC_BASE_URL || 'unknown';
const resultsPath = process.env.CVIDEO_QC_RESULTS || 'tests/browser-qc/test-results/results.json';

let results = null;
if (fs.existsSync(resultsPath)) {
  try { results = JSON.parse(fs.readFileSync(resultsPath, 'utf8')); } catch {}
}

function collect(suite, failures = [], skipped = []) {
  for (const spec of suite?.specs || []) {
    for (const test of spec.tests || []) {
      const outcomes = test.results || [];
      const failed = outcomes.some((r) => r.status && !['passed','skipped'].includes(r.status));
      const wasSkipped = outcomes.length === 0 || outcomes.every((r) => r.status === 'skipped');
      if (failed) failures.push({ title: spec.title, project: test.projectName, errors: outcomes.flatMap((r) => r.errors || []).map((e) => e.message || String(e)) });
      if (wasSkipped) skipped.push({ title: spec.title, project: test.projectName });
    }
  }
  for (const child of suite?.suites || []) collect(child, failures, skipped);
  return { failures, skipped };
}

const summary = results ? collect(results) : { failures: [{ title: 'Playwright result file missing', project: 'gate', errors: [] }], skipped: [] };
const authSkip = summary.skipped.some((item) => /candidate|recruiter|transaction/i.test(item.title));
const blockers = [];
if (summary.failures.length) blockers.push('browser-qc-failed');
if (requiredAuth && (!authConfigured || authSkip)) blockers.push('authenticated-qc-not-executed');

const gate = {
  schemaVersion: 1,
  decision: blockers.length ? 'BLOCKED' : 'READY_FOR_OWNER',
  testedSha,
  baseUrl,
  authenticatedQc: authConfigured && !authSkip ? 'executed' : 'not-proven',
  blockers,
  failures: summary.failures,
  skipped: summary.skipped,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname('qc-evidence/release-gate.json'), { recursive: true });
fs.writeFileSync('qc-evidence/release-gate.json', JSON.stringify(gate, null, 2));
fs.writeFileSync('qc-evidence/release-gate.md', `# CVIDEO QC Release Gate\n\n**Decision:** ${gate.decision}\n\n- Commit: \`${testedSha}\`\n- Target: ${baseUrl}\n- Authenticated QC: ${gate.authenticatedQc}\n- Failures: ${gate.failures.length}\n- Skipped: ${gate.skipped.length}\n- Blockers: ${blockers.length ? blockers.join(', ') : 'none'}\n`);
console.log(JSON.stringify(gate, null, 2));
if (blockers.length) process.exitCode = 1;
