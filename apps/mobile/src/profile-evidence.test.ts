import { describe, expect, it } from 'vitest';
import { certificateInput, educationInput, experienceInput } from './profile-evidence';

describe('mobile profile evidence payloads', () => {
  it('clears an experience end date when the role is current', () => {
    expect(experienceInput({ companyName: 'OGroup', jobTitle: 'Engineer', startDate: '2024-01-01', endDate: '2024-12-01', isCurrent: true })).toMatchObject({ endDate: null, isCurrent: true });
  });

  it('rejects reversed education dates', () => {
    expect(() => educationInput({ institution: 'University', qualification: 'BSc', startDate: '2025-01-01', endDate: '2024-01-01' })).toThrow('End date');
  });

  it('normalizes optional certificate fields and validates URLs', () => {
    expect(certificateInput({ name: 'PMP', issuingOrganization: 'PMI', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' })).toMatchObject({ issueDate: null, credentialId: null });
    expect(() => certificateInput({ name: 'PMP', issuingOrganization: 'PMI', credentialUrl: 'not-a-url' })).toThrow('Credential URL');
  });
});
