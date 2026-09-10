CREATE TABLE IF NOT EXISTS candidate_discovery_settings (
  candidate_id uuid PRIMARY KEY REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  discoverable boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_discovery_settings_discoverable_idx
  ON candidate_discovery_settings(discoverable);
