-- PROPOSED for CSG-PKG-08. Not referenced by the Worker, the dev server or any deployment script. Do not apply without approval.
-- Additive only: one new table. No existing table, row, index or trigger is changed.
-- Purpose: keep each formative level a learner was shown, with the context it was evaluated under, so a later evaluator change
-- cannot erase earned progression (CSG-DEC-14). Rows are appended by the evaluation service; they are never rewritten.
CREATE TABLE IF NOT EXISTS formative_level_history (
  profile_id TEXT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  entry_key TEXT NOT NULL,            -- evaluator | rubric version | policy ref | pathway revision | evidence watermark | level
  evaluator TEXT NOT NULL CHECK(evaluator IN ('legacy-coupled','course-rubric')),
  level INTEGER NOT NULL CHECK(level BETWEEN 0 AND 4),
  body TEXT NOT NULL,                 -- the cs-games.formative-level-history/1 entry as JSON
  recorded INTEGER NOT NULL,
  PRIMARY KEY(profile_id,node_id,entry_key)
);
CREATE INDEX IF NOT EXISTS formative_level_history_profile ON formative_level_history(profile_id,recorded);
CREATE TRIGGER IF NOT EXISTS formative_level_history_immutable BEFORE UPDATE ON formative_level_history
BEGIN SELECT RAISE(ABORT,'Formative level history is append-only'); END;
-- Rollback: DROP TRIGGER formative_level_history_immutable; DROP INDEX formative_level_history_profile; DROP TABLE formative_level_history;
-- Readers that do not know the table are unaffected, so the Worker can be rolled back without dropping it.
