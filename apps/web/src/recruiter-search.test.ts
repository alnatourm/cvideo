import { describe, expect, it } from 'vitest';
import { buildRecruiterSearchParams } from './recruiter-search';

describe('recruiter search parameters', () => {
  it('sends the minimum experience filter including zero', () => {
    expect(buildRecruiterSearchParams({ countryCode: 'jo', city: ' Amman ', minExperience: '4' }).toString())
      .toBe('pageSize=20&countryCode=JO&city=Amman&minExperienceYears=4');
    expect(buildRecruiterSearchParams({ countryCode: '', city: '', minExperience: '0' }).get('minExperienceYears')).toBe('0');
  });

  it('omits an empty minimum experience filter', () => {
    expect(buildRecruiterSearchParams({ countryCode: '', city: '', minExperience: '' }).has('minExperienceYears')).toBe(false);
  });
});
