-- Self Authoring Suite schema. Idempotent: safe to re-run.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  kdf_salt TEXT NOT NULL,
  auth_salt TEXT NOT NULL,
  auth_hash TEXT NOT NULL,
  wrap_pw_iv TEXT NOT NULL,
  wrap_pw_ct TEXT NOT NULL,
  recovery_salt TEXT NOT NULL,
  recovery_auth_hash TEXT NOT NULL,
  wrap_rc_iv TEXT NOT NULL,
  wrap_rc_ct TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
CREATE TABLE IF NOT EXISTS vaults (
  user_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  blob TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
