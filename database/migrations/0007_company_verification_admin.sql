DO $$ BEGIN
  CREATE TYPE company_operational_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS operational_status company_operational_status NOT NULL DEFAULT 'active';

CREATE TABLE IF NOT EXISTS company_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submitted_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status company_verification_status NOT NULL DEFAULT 'pending',
  commercial_registration_number varchar(160) NOT NULL,
  document_key text,
  reviewed_by_admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_verifications_status_created_idx
  ON company_verifications(status, created_at);
CREATE INDEX IF NOT EXISTS company_verifications_company_idx
  ON company_verifications(company_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  target_type varchar(80) NOT NULL,
  target_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_target_idx ON audit_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at);

INSERT INTO company_verifications (
  company_id,
  submitted_by_user_id,
  status,
  commercial_registration_number,
  reviewed_at,
  created_at,
  updated_at
)
SELECT
  c.id,
  cm.user_id,
  c.verification_status,
  c.commercial_registration_number,
  CASE WHEN c.verification_status = 'pending' THEN NULL ELSE c.updated_at END,
  c.created_at,
  c.updated_at
FROM companies c
JOIN LATERAL (
  SELECT company_members.user_id
  FROM company_members
  WHERE company_members.company_id = c.id AND company_members.role = 'company_owner'
  ORDER BY company_members.created_at
  LIMIT 1
) cm ON true
WHERE NOT EXISTS (
  SELECT 1 FROM company_verifications cv WHERE cv.company_id = c.id
);
