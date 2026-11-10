PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, snapshot TEXT NOT NULL,
  created INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS assignments_owner ON assignments(owner, created);
CREATE TABLE IF NOT EXISTS receipts (
  token TEXT PRIMARY KEY, assignment TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  browser TEXT NOT NULL, created INTEGER NOT NULL, finished INTEGER, digest TEXT,
  locked TEXT NOT NULL DEFAULT '{}', payload TEXT
);
CREATE INDEX IF NOT EXISTS receipts_assignment ON receipts(assignment, created);
CREATE INDEX IF NOT EXISTS receipts_browser ON receipts(assignment, browser, finished);
CREATE TABLE IF NOT EXISTS totals (
  assignment TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, key TEXT NOT NULL,
  n INTEGER NOT NULL, c INTEGER NOT NULL, g INTEGER NOT NULL,
  PRIMARY KEY(assignment, key)
);
CREATE TABLE IF NOT EXISTS released_totals (
  assignment TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE, key TEXT NOT NULL,
  n INTEGER NOT NULL, c INTEGER NOT NULL, g INTEGER NOT NULL,
  PRIMARY KEY(assignment, key)
);
-- One SQLite statement commits a receipt and its counts atomically. The temporary
-- payload and any in-progress answers are cleared in the same transaction.
CREATE TRIGGER IF NOT EXISTS merge_completion AFTER UPDATE OF finished ON receipts
WHEN OLD.finished IS NULL AND NEW.finished IS NOT NULL
BEGIN
  INSERT INTO totals(assignment,key,n,c,g)
  SELECT NEW.assignment, json_extract(value,'$.key'), json_extract(value,'$.n'),
    json_extract(value,'$.c'), json_extract(value,'$.g')
  FROM json_each(NEW.payload) WHERE true
  ON CONFLICT(assignment,key) DO UPDATE SET n=n+excluded.n, c=c+excluded.c, g=g+excluded.g;
  INSERT INTO released_totals(assignment,key,n,c,g)
  SELECT assignment,key,n,c,g FROM totals
  WHERE assignment=NEW.assignment
    AND (SELECT g FROM totals WHERE assignment=NEW.assignment AND key='overall') % 5=0
  ON CONFLICT(assignment,key) DO UPDATE SET n=excluded.n,c=excluded.c,g=excluded.g;
  UPDATE receipts SET payload=NULL, locked='{}' WHERE token=NEW.token;
END;

-- Additive pathway storage in the existing reporting database. There are no
-- student accounts or learning-evidence copies in these tables.
CREATE TABLE IF NOT EXISTS class_pathways (
  id TEXT PRIMARY KEY, class_id TEXT NOT NULL UNIQUE, owner TEXT NOT NULL,
  head INTEGER NOT NULL DEFAULT 0, draft_version INTEGER NOT NULL DEFAULT 1,
  draft TEXT NOT NULL, created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS class_pathways_owner ON class_pathways(owner);
CREATE TABLE IF NOT EXISTS pathway_policy_versions (
 pathway_id TEXT NOT NULL REFERENCES class_pathways(id), policy_id TEXT NOT NULL, version INTEGER NOT NULL, definition TEXT NOT NULL,
 PRIMARY KEY(pathway_id,policy_id,version)
);
CREATE TABLE IF NOT EXISTS pathway_revisions (
  pathway_id TEXT NOT NULL REFERENCES class_pathways(id), revision INTEGER NOT NULL,
  parent_revision INTEGER NOT NULL, snapshot TEXT NOT NULL, summary TEXT NOT NULL,
  created INTEGER NOT NULL, PRIMARY KEY(pathway_id,revision)
);
CREATE TRIGGER IF NOT EXISTS validate_pathway_policy_revision BEFORE INSERT ON pathway_revisions
WHEN EXISTS (SELECT 1 FROM json_each(NEW.snapshot,'$.policies') incoming JOIN pathway_policy_versions saved
 ON saved.pathway_id=NEW.pathway_id AND saved.policy_id=json_extract(incoming.value,'$.id') AND saved.version=json_extract(incoming.value,'$.version')
 WHERE saved.definition != json(incoming.value))
BEGIN SELECT RAISE(ABORT,'Create a new policy version'); END;
CREATE TRIGGER IF NOT EXISTS publish_pathway AFTER INSERT ON pathway_revisions
BEGIN
  INSERT OR IGNORE INTO pathway_policy_versions(pathway_id,policy_id,version,definition)
  SELECT NEW.pathway_id,json_extract(value,'$.id'),json_extract(value,'$.version'),json(value) FROM json_each(NEW.snapshot,'$.policies');
  UPDATE class_pathways SET head=NEW.revision,draft=NEW.snapshot,draft_version=draft_version+1 WHERE id=NEW.pathway_id;
END;
CREATE TRIGGER IF NOT EXISTS immutable_pathway_revision BEFORE UPDATE ON pathway_revisions
BEGIN SELECT RAISE(ABORT,'Pathway revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS retain_pathway_revision BEFORE DELETE ON pathway_revisions
BEGIN SELECT RAISE(ABORT,'Pathway revisions are retained'); END;
CREATE TABLE IF NOT EXISTS pathway_status_history (
  pathway_id TEXT NOT NULL REFERENCES class_pathways(id), profile_id TEXT NOT NULL,
  revision INTEGER NOT NULL, digest TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL,
  PRIMARY KEY(pathway_id,profile_id,revision,digest)
);
