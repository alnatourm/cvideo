export interface RecruiterSearchInput {
  countryCode: string;
  city: string;
  minExperience: string;
}

export function buildRecruiterSearchParams(input: RecruiterSearchInput) {
  const params = new URLSearchParams({ pageSize: '20' });
  const countryCode = input.countryCode.trim().toUpperCase();
  const city = input.city.trim();
  const minExperience = input.minExperience.trim();

  if (countryCode) params.set('countryCode', countryCode);
  if (city) params.set('city', city);
  if (minExperience !== '') params.set('minExperienceYears', String(Number(minExperience)));
  return params;
}
