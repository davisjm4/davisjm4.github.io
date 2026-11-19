CREATE TABLE IF NOT EXISTS teacher_accounts (
  owner TEXT PRIMARY KEY,
  account TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'email')),
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS teacher_auth_proofs (
  digest TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'signin', 'google')),
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS teacher_auth_proof_expiry ON teacher_auth_proofs(expires);
CREATE TABLE IF NOT EXISTS teacher_auth_limits (
  key TEXT NOT NULL,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  PRIMARY KEY (key, expires)
);
CREATE INDEX IF NOT EXISTS teacher_auth_limit_expiry ON teacher_auth_limits(expires);
