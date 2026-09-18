#!/usr/bin/env node
import fs from 'node:fs';

const queuePath = process.env.CVIDEO_FIX_QUEUE || 'qc-evidence/fix-agent-queue.json';
const issueFilter = process.env.CVIDEO_FIX_ISSUE ? Number(process.env.CVIDEO_FIX_ISSUE) : null;
const maxAttempts = 3;
if (!fs.existsSync(queuePath)) throw new Error(`Fix queue missing: ${queuePath}`);
const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const items = (queue.items || []).filter((item) => !issueFilter || item.issueNumber === issueFilter);
if (!items.length) {
  console.log(JSON.stringify({ state: 'EMPTY', message: 'No Fix Agent work items.' }, null, 2));
  process.exit(0);
}

const plans = items.map((item) => {
  const attempts = Number(item.attempts || 0);
  const branch = `factory/fix-${item.issueNumber}-${item.signature}`;
  const blocked = attempts >= maxAttempts;
  return {
    schemaVersion: 1,
    issueNumber: item.issueNumber,
    issueUrl: item.issueUrl,
    signature: item.signature,
    severity: item.severity,
    sourceSha: item.testedSha,
    branch,
    attempts,
    maxAttempts,
    state: blocked ? 'NEEDS_HUMAN_ENGINEERING' : 'READY_TO_CLAIM',
    steps: blocked ? [] : [
      'checkout integration branch',
      `create isolated branch ${branch}`,
      'fetch issue and QC evidence',
      'reproduce failing scenario',
      'identify root cause',
      'apply smallest scoped repair',
      'add or strengthen regression test',
      'run targeted tests',
      'run repository CI',
      'open draft repair PR',
      'deploy staging candidate',
      'rerun Browser QC',
      'advance only on READY_FOR_OWNER',
    ],
    invariants: [
      'never commit directly to main/release branch',
      'never disable QC to pass',
      'never weaken security/tenant/auth checks',
      'never expose secrets',
      'never self-merge',
      'never self-approve production',
    ],
  };
});

fs.mkdirSync('qc-evidence', { recursive: true });
fs.writeFileSync('qc-evidence/fix-agent-plan.json', JSON.stringify({ schemaVersion: 1, plans, generatedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ plans }, null, 2));
if (plans.some((p) => p.state === 'NEEDS_HUMAN_ENGINEERING')) process.exitCode = 2;
