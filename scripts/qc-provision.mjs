#!/usr/bin/env node

const baseUrl = (process.env.CVIDEO_QC_BASE_URL || '').replace(/\/$/, '');
const candidateEmail = process.env.CVIDEO_QC_CANDIDATE_EMAIL;
const candidatePassword = process.env.CVIDEO_QC_CANDIDATE_PASSWORD;
const recruiterEmail = process.env.CVIDEO_QC_RECRUITER_EMAIL;
const recruiterPassword = process.env.CVIDEO_QC_RECRUITER_PASSWORD;

function required(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function validateIdentity(label, email, password) {
  if (typeof email !== 'string' || !email.includes('@') || email.length > 320) {
    throw new Error(`QC_CONFIG_INVALID: ${label} email secret is not a valid email address`);
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error(`QC_CONFIG_INVALID: ${label} password secret must be 12-128 characters`);
  }
}

function safeApiError(label, result) {
  const code = typeof result.payload?.code === 'string' ? result.payload.code : undefined;
  const message = typeof result.payload?.message === 'string' ? result.payload.message : undefined;
  const issues = Array.isArray(result.payload?.issues)
    ? result.payload.issues.map((issue) => ({ path: issue?.path, code: issue?.code, message: issue?.message }))
    : undefined;
  return new Error(`${label}: ${JSON.stringify({ status: result.response.status, code, message, issues })}`);
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
  return call('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, clientType: 'web' }),
  });
}

async function ensureCandidate() {
  const existing = await login(candidateEmail, candidatePassword);
  if (existing.response.ok) return 'existing';
  if (existing.response.status === 400) throw safeApiError('QC_CONFIG_INVALID: candidate login rejected by validation', existing);
  if (existing.response.status !== 401) throw safeApiError('candidate login failed', existing);

  const created = await call('/api/v1/auth/register/candidate', {
    method: 'POST',
    body: JSON.stringify({
      email: candidateEmail,
      password: candidatePassword,
      displayName: 'CVIDEO QC Candidate',
      countryCode: 'JO',
      city: 'Amman',
    }),
  });
  if (!created.response.ok && created.response.status !== 409) {
    throw safeApiError('candidate provisioning failed', created);
  }
  const verified = await login(candidateEmail, candidatePassword);
  if (!verified.response.ok) throw safeApiError('QC candidate exists but configured secret cannot authenticate it', verified);
  return created.response.ok ? 'created' : 'existing';
}

async function ensureRecruiter() {
  const existing = await login(recruiterEmail, recruiterPassword);
  if (existing.response.ok) return 'existing';
  if (existing.response.status === 400) throw safeApiError('QC_CONFIG_INVALID: recruiter login rejected by validation', existing);
  if (existing.response.status !== 401) throw safeApiError('recruiter login failed', existing);

  const created = await call('/api/v1/auth/register/company', {
    method: 'POST',
    body: JSON.stringify({
      email: recruiterEmail,
      password: recruiterPassword,
      companyName: 'CVIDEO QC Company',
      countryCode: 'JO',
      city: 'Amman',
      commercialRegistrationNumber: `QC-${Date.now()}`,
    }),
  });
  if (!created.response.ok && created.response.status !== 409) {
    throw safeApiError('recruiter provisioning failed', created);
  }
  const verified = await login(recruiterEmail, recruiterPassword);
  if (!verified.response.ok) throw safeApiError('QC recruiter exists but configured secret cannot authenticate it', verified);
  return created.response.ok ? 'created-pending-verification' : 'existing';
}

required('CVIDEO_QC_BASE_URL', baseUrl);
required('CVIDEO_QC_CANDIDATE_EMAIL', candidateEmail);
required('CVIDEO_QC_CANDIDATE_PASSWORD', candidatePassword);
required('CVIDEO_QC_RECRUITER_EMAIL', recruiterEmail);
required('CVIDEO_QC_RECRUITER_PASSWORD', recruiterPassword);
validateIdentity('candidate', candidateEmail, candidatePassword);
validateIdentity('recruiter', recruiterEmail, recruiterPassword);

const candidate = await ensureCandidate();
const recruiter = await ensureRecruiter();
console.log(JSON.stringify({ candidate, recruiter }));
