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
