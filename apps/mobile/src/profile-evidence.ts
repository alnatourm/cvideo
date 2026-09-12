import type { CandidateCertificateInput, CandidateEducationInput, CandidateExperienceInput } from './api';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function optional(value: string) {
  return value.trim() || null;
}

function date(value: string, label: string, requiredValue = false) {
  const normalized = optional(value);
  if (!normalized && requiredValue) throw new Error(`${label} is required.`);
  if (normalized && !DATE_PATTERN.test(normalized)) throw new Error(`${label} must use YYYY-MM-DD.`);
  return normalized;
}

function ordered(start: string | null, end: string | null) {
  if (start && end && end < start) throw new Error('End date cannot be before start date.');
}

export function experienceInput(draft: Record<string, string | boolean>): CandidateExperienceInput {
  const startDate = date(String(draft.startDate ?? ''), 'Start date', true)!;
  const isCurrent = Boolean(draft.isCurrent);
  const endDate = isCurrent ? null : date(String(draft.endDate ?? ''), 'End date');
  ordered(startDate, endDate);
  return {
    companyName: required(String(draft.companyName ?? ''), 'Company'),
    jobTitle: required(String(draft.jobTitle ?? ''), 'Job title'),
    location: optional(String(draft.location ?? '')),
    startDate,
    endDate,
    isCurrent,
    description: optional(String(draft.description ?? '')),
  };
}

export function educationInput(draft: Record<string, string>): CandidateEducationInput {
  const startDate = date(draft.startDate ?? '', 'Start date');
  const endDate = date(draft.endDate ?? '', 'End date');
  ordered(startDate, endDate);
  return {
    institution: required(draft.institution ?? '', 'Institution'),
    qualification: required(draft.qualification ?? '', 'Qualification'),
    fieldOfStudy: optional(draft.fieldOfStudy ?? ''),
    startDate,
    endDate,
    description: optional(draft.description ?? ''),
  };
}

export function certificateInput(draft: Record<string, string>): CandidateCertificateInput {
  const issueDate = date(draft.issueDate ?? '', 'Issue date');
  const expiryDate = date(draft.expiryDate ?? '', 'Expiry date');
  ordered(issueDate, expiryDate);
  const credentialUrl = optional(draft.credentialUrl ?? '');
  if (credentialUrl) {
    try { new URL(credentialUrl); } catch { throw new Error('Credential URL must be valid.'); }
  }
  return {
    name: required(draft.name ?? '', 'Certificate name'),
    issuingOrganization: required(draft.issuingOrganization ?? '', 'Issuing organization'),
    issueDate,
    expiryDate,
    credentialId: optional(draft.credentialId ?? ''),
    credentialUrl,
  };
}
