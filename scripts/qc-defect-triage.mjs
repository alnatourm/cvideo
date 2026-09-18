#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const gatePath = process.env.CVIDEO_QC_GATE || 'qc-evidence/release-gate.json';
const outPath = 'qc-evidence/defect-handoff.json';
if (!fs.existsSync(gatePath)) throw new Error(`Release gate evidence missing: ${gatePath}`);
const gate = JSON.parse(fs.readFileSync(gatePath, 'utf8'));

function severity(failure) {
  const text = `${failure.title || ''} ${(failure.errors || []).join(' ')}`.toLowerCase();
  if (/auth|tenant|forbidden|unauthorized|cross.?tenant|security/.test(text)) return 'BLOCKER';
  if (/transaction|interview|conversation|message|search|saved.?list|candidate|recruiter|login|video/.test(text)) return 'HIGH';
  if (/mobile|desktop|layout|profile|account/.test(text)) return 'MEDIUM';
  return 'LOW';
}

const infrastructureBlocked = (gate.blockers || []).some((b) => ['qc-configuration-invalid','qc-provisioning-failed','browser-qc-not-executed','deployed-commit-not-proven'].includes(b));
const defects = infrastructureBlocked ? [] : (gate.failures || []).map((failure) => {
  const sev = severity(failure);
  const normalizedFailure = (failure.errors || []).join(' ')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\b[0-9a-f]{40}\b/g, '<sha>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/g, '<uuid>')
    .replace(/\b\d+ms\b/g, '<duration>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
  const signatureSource = `${failure.project || 'unknown'}|${failure.title || 'unknown'}|${normalizedFailure || 'no-error'}`;
  const signature = crypto.createHash('sha256').update(signatureSource).digest('hex').slice(0, 12);
  return {
    signature, severity: sev, title: `[QC][${sev}] ${failure.title || 'Browser QC failure'}`, project: failure.project || 'unknown',
    testedSha: gate.testedSha, target: gate.baseUrl, errors: failure.errors || [],
    reproduction: `Run Browser QC scenario "${failure.title || 'unknown'}" on ${failure.project || 'unknown'} against ${gate.baseUrl}.`,
    expected: 'Mandatory CVIDEO journey completes without regression.',
    actual: (failure.errors || []).join('\n').slice(0, 4000) || 'Browser QC scenario failed.',
    fixAgent: {
      allowed: ['inspect evidence','reproduce','change scoped application/test code','add regression test','open pull request'],
      forbidden: ['disable QC','weaken assertion to hide defect','expose secrets','auto-merge production','bypass release gate'],
      completion: ['root cause documented','regression test added or strengthened','CI green','Browser QC green','release gate reevaluated'],
    },
  };
});

const handoff = {
  schemaVersion: 2, gateDecision: gate.decision, testedSha: gate.testedSha, target: gate.baseUrl, defects,
  infrastructureIncident: infrastructureBlocked ? { blockers: gate.blockers, provisioning: gate.provisioning || null } : null,
  nextAction: infrastructureBlocked ? 'FACTORY_INFRASTRUCTURE_REPAIR' : (defects.length ? 'DEFECT_AGENT_CREATE_OR_UPDATE_ISSUES' : 'NO_DEFECT_HANDOFF'),
  generatedAt: new Date().toISOString(),
};
fs.mkdirSync('qc-evidence', { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(handoff, null, 2));
console.log(JSON.stringify(handoff, null, 2));
