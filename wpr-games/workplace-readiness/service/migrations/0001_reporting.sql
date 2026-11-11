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
