-- Student practice attempts live alongside the existing profile evidence.
CREATE TABLE IF NOT EXISTS mastery_attempt_states (
  profile_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  marker TEXT NOT NULL,
  PRIMARY KEY(profile_id,node_id)
);

CREATE TABLE IF NOT EXISTS mastery_attempts (
  profile_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY(profile_id,node_id,sequence),
  FOREIGN KEY(profile_id,node_id) REFERENCES mastery_attempt_states(profile_id,node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mastery_restart_requests (
  profile_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY(profile_id,node_id,request_id),
  FOREIGN KEY(profile_id,node_id) REFERENCES mastery_attempt_states(profile_id,node_id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS mastery_attempt_closed_immutable BEFORE UPDATE ON mastery_attempts
WHEN json_extract(OLD.body,'$.closedAt') IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Closed mastery practice attempts are immutable'); END;
