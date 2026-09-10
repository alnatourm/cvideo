CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE candidate_video_status AS ENUM (
    'pending',
    'uploading',
    'processing',
    'ready',
    'rejected',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name_en varchar(160) NOT NULL,
  name_ar varchar(160) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_code_unique ON categories(code);

CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  code varchar(80) NOT NULL,
  name_en varchar(160) NOT NULL,
  name_ar varchar(160) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_code_unique ON subcategories(category_id, code);
CREATE INDEX IF NOT EXISTS subcategories_category_idx ON subcategories(category_id);

CREATE TABLE IF NOT EXISTS job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL,
  name_en varchar(180) NOT NULL,
  name_ar varchar(180) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS job_titles_code_unique ON job_titles(code);

CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(100) NOT NULL,
  name_en varchar(180) NOT NULL,
  name_ar varchar(180) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS skills_code_unique ON skills(code);

CREATE TABLE IF NOT EXISTS languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(16) NOT NULL,
  name_en varchar(120) NOT NULL,
  name_ar varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS languages_code_unique ON languages(code);

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name varchar(160) NOT NULL,
  headline varchar(180),
  profile_photo_url text,
  country_code varchar(2) NOT NULL,
  city varchar(120) NOT NULL,
  primary_category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  primary_subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  years_experience integer NOT NULL DEFAULT 0 CHECK (years_experience >= 0 AND years_experience <= 80),
  professional_summary text,
  cv_storage_key text,
  cv_original_filename varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_profiles_user_unique ON candidate_profiles(user_id);
CREATE INDEX IF NOT EXISTS candidate_profiles_location_idx ON candidate_profiles(country_code, city);
CREATE INDEX IF NOT EXISTS candidate_profiles_category_idx ON candidate_profiles(primary_category_id, primary_subcategory_id);

-- user_id intentionally has no FK until the security-gated identity schema is approved and implemented.

CREATE TABLE IF NOT EXISTS candidate_extra_subfields (
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES subcategories(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 2),
  PRIMARY KEY (candidate_id, subcategory_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_extra_subfields_position_unique ON candidate_extra_subfields(candidate_id, position);

CREATE TABLE IF NOT EXISTS candidate_preferred_roles (
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_title_id uuid NOT NULL REFERENCES job_titles(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position BETWEEN 1 AND 5),
  PRIMARY KEY (candidate_id, job_title_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_preferred_roles_position_unique ON candidate_preferred_roles(candidate_id, position);

CREATE TABLE IF NOT EXISTS candidate_skills (
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS candidate_languages (
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  language_id uuid NOT NULL REFERENCES languages(id) ON DELETE RESTRICT,
  proficiency varchar(32),
  PRIMARY KEY (candidate_id, language_id)
);

CREATE TABLE IF NOT EXISTS candidate_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  company_name varchar(180) NOT NULL,
  job_title varchar(180) NOT NULL,
  location varchar(180),
  start_date date NOT NULL,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (NOT is_current OR end_date IS NULL)
);
CREATE INDEX IF NOT EXISTS candidate_experiences_candidate_idx ON candidate_experiences(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  institution varchar(200) NOT NULL,
  qualification varchar(180) NOT NULL,
  field_of_study varchar(180),
  start_date date,
  end_date date,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS candidate_education_candidate_idx ON candidate_education(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  issuing_organization varchar(200) NOT NULL,
  issue_date date,
  expiry_date date,
  credential_id varchar(180),
  credential_url text,
  attachment_storage_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (issue_date IS NULL OR expiry_date IS NULL OR expiry_date >= issue_date)
);
CREATE INDEX IF NOT EXISTS candidate_certificates_candidate_idx ON candidate_certificates(candidate_id);

CREATE TABLE IF NOT EXISTS candidate_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  status candidate_video_status NOT NULL DEFAULT 'pending',
  storage_key text,
  playback_key text,
  thumbnail_key text,
  original_filename varchar(255),
  mime_type varchar(120),
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 0 AND 30),
  height integer CHECK (height IS NULL OR height BETWEEN 1 AND 720),
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS candidate_videos_candidate_unique ON candidate_videos(candidate_id);
CREATE INDEX IF NOT EXISTS candidate_videos_status_idx ON candidate_videos(status);
