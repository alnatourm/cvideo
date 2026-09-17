#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const issuePath = process.env.CVIDEO_FIX_ISSUE_FILE || 'qc-evidence/fix-agent-issue.json';
if (!fs.existsSync(issuePath)) throw new Error(`Missing issue contract: ${issuePath}`);
const issue = JSON.parse(fs.readFileSync(issuePath, 'utf8'));
const body = issue.body || '';
const signature = (body.match(/cvideo-qc-signature:([a-f0-9]{12})/) || [])[1];
if (!signature) throw new Error('QC signature missing from issue.');
const changedHint = [...body.matchAll(/`((?:apps|packages|tests|scripts)\/[^`\n]+)`/g)].map((m) => m[1]);
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const keywords = `${issue.title || ''} ${body}`.toLowerCase().split(/[^a-z0-9_-]+/).filter((w) => w.length >= 5);
const scored = tracked
  .filter((f) => /^(apps|packages|tests)\//.test(f) && !/node_modules|dist|coverage/.test(f))
  .map((file) => ({ file, score: keywords.reduce((n, k) => n + (file.toLowerCase().includes(k) ? 2 : 0), 0) + (changedHint.includes(file) ? 10 : 0) }))
  .filter((x) => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);
const context = {
  schemaVersion: 1,
  issue: { number: issue.number, title: issue.title, url: issue.url },
  signature,
  candidateFiles: scored,
  instructions: [
    'Reproduce before patching.',
    'Prefer the smallest source change that fixes root cause.',
    'Add or strengthen a regression test.',
    'Do not edit Factory gate/triage/sync controls.',
    'Do not weaken auth, tenant isolation, security checks or assertions.',
    'Do not read, print or commit secrets.',
    'Return NEEDS_DIAGNOSIS instead of guessing when evidence is insufficient.',
  ],
};
fs.mkdirSync('qc-evidence', { recursive: true });
fs.writeFileSync('qc-evidence/fix-agent-context.json', JSON.stringify(context, null, 2));
fs.writeFileSync('qc-evidence/FIX_AGENT_TASK.md', `# Fix Agent Task\n\nIssue: #${issue.number} ${issue.title}\nQC signature: ${signature}\n\n## Defect contract\n${body}\n\n## Candidate files\n${scored.map((x) => `- ${x.file}`).join('\n') || '- No reliable file candidates. Inspect repository before changing code.'}\n\n## Guardrails\n${context.instructions.map((x) => `- ${x}`).join('\n')}\n`);
console.log(JSON.stringify(context, null, 2));
