import { describe, expect, it } from 'vitest';
import {
  candidateCertificateInputSchema,
  candidateExperienceInputSchema,
  candidateProfileInputSchema,
  introductionVideoMetadataSchema,
} from './index.js';

const ids = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);

describe('candidate profile validation', () => {
  it('accepts at most two extra subfields and five preferred roles', () => {
    const base = {
      displayName: 'Candidate Name',
      countryCode: 'jo',
      city: 'Amman',
      yearsExperience: 5,
    };

    expect(
      candidateProfileInputSchema.safeParse({
        ...base,
        extraSubfieldIds: ids.slice(0, 2),
        preferredRoleIds: ids.slice(0, 5),
      }).success,
    ).toBe(true);

    expect(
      candidateProfileInputSchema.safeParse({
        ...base,
        extraSubfieldIds: ids.slice(0, 3),
      }).success,
    ).toBe(false);

    expect(
      candidateProfileInputSchema.safeParse({
        ...base,
        preferredRoleIds: ids,
      }).success,
    ).toBe(false);
  });

  it('normalizes the country code', () => {
    const result = candidateProfileInputSchema.parse({
      displayName: 'Candidate Name',
      countryCode: 'jo',
      city: 'Amman',
      yearsExperience: 0,
    });

    expect(result.countryCode).toBe('JO');
  });
});

describe('introduction video validation', () => {
  it('accepts a 30-second 720p MP4 and rejects longer or higher video metadata', () => {
    expect(
      introductionVideoMetadataSchema.safeParse({
        durationSeconds: 30,
        height: 720,
        mimeType: 'video/mp4',
        sizeBytes: 20_000_000,
      }).success,
    ).toBe(true);

    expect(
      introductionVideoMetadataSchema.safeParse({
        durationSeconds: 31,
        height: 720,
        mimeType: 'video/mp4',
        sizeBytes: 20_000_000,
      }).success,
    ).toBe(false);

    expect(
      introductionVideoMetadataSchema.safeParse({
        durationSeconds: 30,
        height: 1080,
        mimeType: 'video/mp4',
        sizeBytes: 20_000_000,
      }).success,
    ).toBe(false);
  });
});

describe('professional history validation', () => {
  it('rejects an end date before a start date', () => {
    expect(
      candidateExperienceInputSchema.safeParse({
        companyName: 'Example Co',
        jobTitle: 'Sales Manager',
        startDate: '2026-01-01',
        endDate: '2025-12-31',
        isCurrent: false,
      }).success,
    ).toBe(false);
  });

  it('rejects certificate expiry before issue date', () => {
    expect(
      candidateCertificateInputSchema.safeParse({
        name: 'Certificate',
        issuingOrganization: 'Issuer',
        issueDate: '2026-02-01',
        expiryDate: '2026-01-01',
      }).success,
    ).toBe(false);
  });
});
