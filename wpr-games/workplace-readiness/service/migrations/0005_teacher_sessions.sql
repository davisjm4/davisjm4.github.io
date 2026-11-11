CREATE TABLE IF NOT EXISTS teacher_sessions (
  digest TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  account TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS teacher_session_expiry ON teacher_sessions(expires);
