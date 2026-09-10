DO $$ BEGIN
  CREATE TYPE interview_meeting_type AS ENUM ('google_meet', 'video_call', 'in_person');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM ('pending', 'accepted', 'suggested_time', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  requested_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  opportunity_title varchar(180) NOT NULL,
  starts_at_utc timestamptz NOT NULL,
  timezone varchar(80) NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 10 AND 240),
  meeting_type interview_meeting_type NOT NULL,
  message text,
  location text,
  status interview_status NOT NULL DEFAULT 'pending',
  suggested_starts_at_utc timestamptz,
  suggested_timezone varchar(80),
  suggested_message text,
  meeting_provider varchar(80),
  meeting_external_id text,
  meeting_join_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX interviews_company_status_idx ON interviews(company_id, status, starts_at_utc);
CREATE INDEX interviews_candidate_status_idx ON interviews(candidate_id, status, starts_at_utc);
