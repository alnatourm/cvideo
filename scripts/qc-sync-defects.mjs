#!/usr/bin/env node
import fs from 'node:fs';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
const handoffPath = process.env.CVIDEO_QC_HANDOFF || 'qc-evidence/defect-handoff.json';
if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
if (!fs.existsSync(handoffPath)) throw new Error(`Defect handoff missing: ${handoffPath}`);
const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
const [owner, repository] = repo.split('/');
const api = 'https://api.github.com';
const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'content-type': 'application/json' };

async function gh(path, init = {}) {
  const response = await fetch(`${api}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`GitHub ${init.method || 'GET'} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const runUrl = runId ? `${server}/${repo}/actions/runs/${runId}` : `${server}/${repo}/actions`;
const fixQueue = [];
for (const defect of handoff.defects || []) {
  const marker = `<!-- cvideo-qc-signature:${defect.signature} -->`;
  const q = encodeURIComponent(`repo:${repo} is:issue is:open in:body "cvideo-qc-signature:${defect.signature}"`);
  const found = await gh(`/search/issues?q=${q}&per_page=10`);
  const body = `${marker}\n## Autonomous QC defect\n\n**Severity:** ${defect.severity}\n**Scenario:** ${defect.title.replace(/^\[QC\]\[[^\]]+\]\s*/, '')}\n**Project:** ${defect.project}\n**Tested commit:** \`${defect.testedSha}\`\n**Target:** ${defect.target}\n**Evidence:** ${runUrl}\n\n### Reproduction\n${defect.reproduction}\n\n### Expected\n${defect.expected}\n\n### Actual\n\`\`\`text\n${defect.actual}\n\`\`\`\n\n### Fix Agent contract\nThe Fix Agent may reproduce, inspect evidence, make a scoped repair, add/strengthen a regression test and open a PR. It must not disable QC, weaken assertions to conceal the defect, expose secrets, bypass the release gate, or auto-merge production.\n\n### Completion gate\n- [ ] Root cause documented\n- [ ] Scoped fix implemented\n- [ ] Regression test added/strengthened\n- [ ] CI green\n- [ ] Browser QC green\n- [ ] Release gate reevaluated\n`;
  let issue;
  if (found.items?.length) {
    issue = found.items[0];
    await gh(`/repos/${owner}/${repository}/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `QC reproduced this defect on \`${defect.testedSha}\`. Evidence: ${runUrl}` }) });
  } else {
    issue = await gh(`/repos/${owner}/${repository}/issues`, { method: 'POST', body: JSON.stringify({ title: defect.title, body }) });
  }
  fixQueue.push({ signature: defect.signature, severity: defect.severity, issueNumber: issue.number, issueUrl: issue.html_url, title: defect.title, testedSha: defect.testedSha, fixAgent: defect.fixAgent });
}
fs.mkdirSync('qc-evidence', { recursive: true });
fs.writeFileSync('qc-evidence/fix-agent-queue.json', JSON.stringify({ schemaVersion: 1, sourceRun: runUrl, items: fixQueue, generatedAt: new Date().toISOString() }, null, 2));
console.log(JSON.stringify({ synced: fixQueue.length, queue: fixQueue }, null, 2));
