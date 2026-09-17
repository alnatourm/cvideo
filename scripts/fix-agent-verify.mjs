#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const base = process.env.CVIDEO_FIX_BASE || 'deploy/railway-staging-v1';
const issue = process.env.CVIDEO_FIX_ISSUE || 'unknown';
const signature = process.env.CVIDEO_FIX_SIGNATURE || 'unknown';

// Repair agents may change product code and regression tests only. Factory control-plane
// files are immutable from a repair branch, including this verifier itself.
const forbidden = [
  /^\.github\/workflows\/browser-qc\.yml$/,
  /^\.github\/workflows\/fix-agent-.*\.ya?ml$/,
  /^scripts\/qc-.*\.mjs$/,
  /^scripts\/fix-agent-.*\.mjs$/,
  /^docs\/ai-factory\//,
];

const output = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
output('git', ['fetch', 'origin', base]);
const files = output('git', ['diff', '--name-only', `origin/${base}...HEAD`]).split('\n').filter(Boolean);
if (!files.length) throw new Error('Fix Agent produced no repair changes.');

const violations = files.filter((file) => forbidden.some((rule) => rule.test(file)));
if (violations.length) throw new Error(`Fix Agent changed protected Factory controls: ${violations.join(', ')}`);

const testFiles = files.filter((file) => /(^|\/)(__tests__|tests?|e2e)(\/|\.|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(file));
if (!testFiles.length) throw new Error('Repair must add or strengthen at least one regression test.');

const evidence = {
  schemaVersion: 2,
  issue,
  signature,
  base,
  head: output('git', ['rev-parse', 'HEAD']),
  files,
  testFiles,
  protectedControlViolations: [],
  decision: 'PATCH_STRUCTURE_ACCEPTED',
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('qc-evidence', { recursive: true });
fs.writeFileSync('qc-evidence/fix-agent-verification.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
