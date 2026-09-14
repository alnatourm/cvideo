ALTER TABLE candidate_profiles
  ADD COLUMN IF NOT EXISTS certificate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highest_education_level varchar(32) NOT NULL DEFAULT 'none';

UPDATE candidate_profiles AS profile
SET certificate_count = LEAST(50, evidence.certificate_count)
FROM (
  SELECT candidate_id, COUNT(*)::integer AS certificate_count
  FROM candidate_certificates
  GROUP BY candidate_id
) AS evidence
WHERE profile.id = evidence.candidate_id
  AND profile.certificate_count = 0;

UPDATE candidate_profiles AS profile
SET highest_education_level = inferred.level
FROM (
  SELECT candidate_id,
    CASE
      WHEN bool_or(lower(qualification) ~ '(professor|prof\.|أستاذ)') THEN 'professor'
      WHEN bool_or(lower(qualification) ~ '(doctor|phd|ph\.d|دكتوراه)') THEN 'doctorate'
      WHEN bool_or(lower(qualification) ~ '(master|msc|m\.sc|ماجستير)') THEN 'master'
      WHEN bool_or(lower(qualification) ~ '(bachelor|bsc|b\.sc|بكالوريوس)') THEN 'bachelor'
      WHEN bool_or(lower(qualification) ~ '(diploma|دبلوم)') THEN 'diploma'
      WHEN bool_or(lower(qualification) ~ '(vocational|technical|مهني|تقني)') THEN 'vocational'
      WHEN bool_or(lower(qualification) ~ '(high school|secondary|ثانوي)') THEN 'high_school'
      ELSE 'none'
    END AS level
  FROM candidate_education
  GROUP BY candidate_id
) AS inferred
WHERE profile.id = inferred.candidate_id
  AND profile.highest_education_level = 'none';

DO $$ BEGIN
  ALTER TABLE candidate_profiles ADD CONSTRAINT candidate_profiles_certificate_count_check
    CHECK (certificate_count BETWEEN 0 AND 50);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE candidate_profiles ADD CONSTRAINT candidate_profiles_highest_education_check
    CHECK (highest_education_level IN ('none', 'high_school', 'vocational', 'diploma', 'bachelor', 'master', 'doctorate', 'professor'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
