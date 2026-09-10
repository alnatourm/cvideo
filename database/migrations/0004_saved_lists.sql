CREATE TABLE IF NOT EXISTS saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  description text,
  created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_lists_company_idx ON saved_lists(company_id);

CREATE TABLE IF NOT EXISTS saved_candidates (
  list_id uuid NOT NULL REFERENCES saved_lists(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  added_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS saved_candidates_candidate_idx ON saved_candidates(candidate_id);
