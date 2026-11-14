-- Class-directed learning has its own records. No practice or assessment data is copied.
CREATE TABLE IF NOT EXISTS learning_focus (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES profile_classes(id) ON DELETE CASCADE,
  created INTEGER NOT NULL,
  head INTEGER NOT NULL DEFAULT 1,
  UNIQUE (class_id, id)
);

CREATE INDEX IF NOT EXISTS learning_focus_by_class ON learning_focus(class_id, created);

CREATE TABLE IF NOT EXISTS learning_focus_revisions (
  focus_id TEXT NOT NULL REFERENCES learning_focus(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK(revision > 0),
  pathway_id TEXT NOT NULL,
  pathway_revision INTEGER NOT NULL,
  actor TEXT NOT NULL,
  recorded INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  request_digest TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('draft', 'published', 'ended', 'canceled')),
  start_at INTEGER NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('class', 'group', 'individual')),
  target TEXT NOT NULL CHECK(json_valid(target)),
  destinations TEXT NOT NULL CHECK(json_valid(destinations)),
  restricted INTEGER NOT NULL CHECK(restricted IN (0, 1)),
  PRIMARY KEY (focus_id, revision),
  UNIQUE (focus_id, request_id),
  FOREIGN KEY (pathway_id, pathway_revision) REFERENCES pathway_revisions(pathway_id, revision)
);

CREATE TRIGGER IF NOT EXISTS learning_focus_revision_immutable
BEFORE UPDATE ON learning_focus_revisions
BEGIN SELECT RAISE(ABORT, 'Learning focus revisions are immutable'); END;

CREATE TABLE IF NOT EXISTS learning_focus_recipients (
  focus_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  profile_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (focus_id, revision, profile_id),
  FOREIGN KEY (focus_id, revision) REFERENCES learning_focus_revisions(focus_id, revision) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_focus_releases (
  focus_id TEXT NOT NULL,
  grant_revision INTEGER NOT NULL,
  profile_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  recorded INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  PRIMARY KEY (focus_id, grant_revision, profile_id),
  FOREIGN KEY (focus_id, grant_revision) REFERENCES learning_focus_revisions(focus_id, revision) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_focus_progress (
  focus_id TEXT NOT NULL,
  focus_revision INTEGER NOT NULL,
  profile_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK(state IN ('started', 'in-progress', 'complete')),
  updated INTEGER NOT NULL,
  PRIMARY KEY (focus_id, focus_revision, profile_id),
  FOREIGN KEY (focus_id, focus_revision) REFERENCES learning_focus_revisions(focus_id, revision) ON DELETE CASCADE
);
