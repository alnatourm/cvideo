#!/usr/bin/env node
import fs from 'node:fs';

const baseUrl = (process.env.CVIDEO_QC_BASE_URL || '').replace(/\/$/, '');
const candidateEmail = process.env.CVIDEO_QC_CANDIDATE_EMAIL;
const candidatePassword = process.env.CVIDEO_QC_CANDIDATE_PASSWORD;
const recruiterEmail = process.env.CVIDEO_QC_RECRUITER_EMAIL;
const recruiterPassword = process.env.CVIDEO_QC_RECRUITER_PASSWORD;
const evidencePath = 'qc-evidence/provisioning.json';

function writeEvidence(status, actor, reason, details = {}) {
  fs.mkdirSync('qc-evidence', { recursive: true });
  const evidence = { schemaVersion: 1, status, actor, reason, ...details, generatedAt: new Date().toISOString() };
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  return evidence;
}

function required(name, value) {
  if (!value) throw Object.assign(new Error(`${name} is required`), { qcStatus: 'CONFIG_INVALID', actor: 'configuration' });
  return value;
}

function validateIdentity(label, email, password) {
  if (typeof email !== 'string' || !email.includes('@') || email.length > 320) {
    throw Object.assign(new Error(`${label} email secret is not a valid email address`), { qcStatus: 'CONFIG_INVALID', actor: label });
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw Object.assign(new Error(`${label} password secret must be 12-128 characters`), { qcStatus: 'CONFIG_INVALID', actor: label });
  }
}

function apiDetails(result) {
  const code = typeof result.payload?.code === 'string' ? result.payload.code : undefined;
  const message = typeof result.payload?.message === 'string' ? result.payload.message : undefined;
  const issues = Array.isArray(result.payload?.issues)
    ? result.payload.issues.map((issue) => ({ path: issue?.path, code: issue?.code, message: issue?.message }))
    : undefined;
  return { httpStatus: result.response.status, code, message, issues };
}

function apiError(label, result, actor) {
  const details = apiDetails(result);
  const status = result.response.status >= 500 ? 'API_FAILED' : 'AUTH_FAILED';
  return Object.assign(new Error(`${label}: ${JSON.stringify(details)}`), { qcStatus: status, actor, details });
}

async function call(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function login(email, password) {
  return call('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password, clientType: 'web' }) });
}

async function ensureCandidate() {
  const existing = await login(candidateEmail, candidatePassword);
  if (existing.response.ok) return 'existing';
  if (existing.response.status === 400) throw Object.assign(apiError('candidate login rejected by validation', existing, 'candidate'), { qcStatus: 'CONFIG_INVALID' });
  if (existing.response.status !== 401) throw apiError('candidate login failed', existing, 'candidate');
  const created = await call('/api/v1/auth/register/candidate', {
    method: 'POST',
    body: JSON.stringify({ email: candidateEmail, password: candidatePassword, displayName: 'CVIDEO QC Candidate', countryCode: 'JO', city: 'Amman' }),
  });
  if (!created.response.ok && created.response.status !== 409) throw apiError('candidate provisioning failed', created, 'candidate');
  const verified = await login(candidateEmail, candidatePassword);
  if (!verified.response.ok) throw apiError('QC candidate exists but configured secret cannot authenticate it', verified, 'candidate');
  return created.response.ok ? 'created' : 'existing';
}

async function ensureRecruiter() {
  const existing = await login(recruiterEmail, recruiterPassword);
  if (existing.response.ok) return 'existing';
  if (existing.response.status === 400) throw Object.assign(apiError('recruiter login rejected by validation', existing, 'recruiter'), { qcStatus: 'CONFIG_INVALID' });
  if (existing.response.status !== 401) throw apiError('recruiter login failed', existing, 'recruiter');
  const created = await call('/api/v1/auth/register/company', {
    method: 'POST',
    body: JSON.stringify({ email: recruiterEmail, password: recruiterPassword, companyName: 'CVIDEO QC Company', countryCode: 'JO', city: 'Amman', commercialRegistrationNumber: `QC-${Date.now()}` }),
  });
  if (!created.response.ok && created.response.status !== 409) throw apiError('recruiter provisioning failed', created, 'recruiter');
  const verified = await login(recruiterEmail, recruiterPassword);
  if (!verified.response.ok) throw apiError('QC recruiter exists but configured secret cannot authenticate it', verified, 'recruiter');
  return created.response.ok ? 'created-pending-verification' : 'existing';
}

try {
  required('CVIDEO_QC_BASE_URL', baseUrl);
  required('CVIDEO_QC_CANDIDATE_EMAIL', candidateEmail);
  required('CVIDEO_QC_CANDIDATE_PASSWORD', candidatePassword);
  required('CVIDEO_QC_RECRUITER_EMAIL', recruiterEmail);
  required('CVIDEO_QC_RECRUITER_PASSWORD', recruiterPassword);
  validateIdentity('candidate', candidateEmail, candidatePassword);
  validateIdentity('recruiter', recruiterEmail, recruiterPassword);
  const candidate = await ensureCandidate();
  const recruiter = await ensureRecruiter();
  console.log(JSON.stringify(writeEvidence('READY', 'all', 'QC identities provisioned', { candidate, recruiter })));
} catch (error) {
  const status = error.qcStatus || 'PROVISIONING_FAILED';
  const actor = error.actor || 'unknown';
  const reason = error.message || String(error);
  writeEvidence(status, actor, reason, error.details ? { details: error.details } : {});
  console.error(`QC provisioning blocked: ${status} (${actor})`);
  process.exitCode = 1;
}
