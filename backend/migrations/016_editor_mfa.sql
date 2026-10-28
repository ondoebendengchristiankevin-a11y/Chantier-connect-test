ALTER TABLE users
  ADD COLUMN mfa_secret_encrypted text,
  ADD COLUMN mfa_pending_secret_encrypted text,
  ADD COLUMN mfa_enabled_at timestamptz;

UPDATE users
SET session_version = session_version + 1
WHERE role = 'EDITOR';

CREATE TABLE editor_mfa_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('setup', 'login')),
  remember_me boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX editor_mfa_challenges_expiry_idx
  ON editor_mfa_challenges (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE editor_mfa_recovery_codes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code_hash)
);
