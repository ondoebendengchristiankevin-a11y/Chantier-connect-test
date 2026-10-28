DROP TABLE IF EXISTS editor_mfa_recovery_codes;
DROP TABLE IF EXISTS editor_mfa_challenges;

ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_enabled_at,
  DROP COLUMN IF EXISTS mfa_pending_secret_encrypted,
  DROP COLUMN IF EXISTS mfa_secret_encrypted;
