-- Additive migration for the shared reporting database.
CREATE TABLE IF NOT EXISTS profile_classes (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL,
  invite TEXT NOT NULL UNIQUE, created INTEGER NOT NULL,
  expires INTEGER NOT NULL, archived INTEGER
);
CREATE INDEX IF NOT EXISTS profile_class_owner ON profile_classes(owner, expires);
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL REFERENCES profile_classes(id) ON DELETE CASCADE,
  recovery TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS student_profile_class ON student_profiles(class_id);
CREATE TABLE IF NOT EXISTS profile_sessions (
  digest TEXT PRIMARY KEY, profile TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profile_session_owner ON profile_sessions(profile);
CREATE TABLE IF NOT EXISTS performance_events (
  profile TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  id TEXT NOT NULL, version INTEGER NOT NULL, pathway TEXT NOT NULL, activity TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('practice','assessment')),
  occurred INTEGER NOT NULL, data TEXT NOT NULL,
  PRIMARY KEY(profile, id)
);
CREATE INDEX IF NOT EXISTS performance_history ON performance_events(profile, kind, occurred);
CREATE TABLE IF NOT EXISTS profile_limits (
  scope TEXT NOT NULL, window INTEGER NOT NULL, hits INTEGER NOT NULL,
  PRIMARY KEY(scope, window)
);

-- A deleted class must not leave assignments or attempt receipts tied to it.
CREATE TRIGGER IF NOT EXISTS delete_profile_class_assignments
AFTER DELETE ON profile_classes
BEGIN
  DELETE FROM assignments WHERE json_extract(snapshot,'$.profileClassId')=OLD.id;
END;
