-- Existing Workplace Readiness classes keep their original course.
ALTER TABLE profile_classes ADD COLUMN course_id TEXT NOT NULL DEFAULT 'workplace';
ALTER TABLE student_profiles ADD COLUMN event_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN evidence_count INTEGER NOT NULL DEFAULT 0;
UPDATE student_profiles SET
  event_count=(SELECT COUNT(*) FROM performance_events WHERE profile=student_profiles.id),
  evidence_count=(SELECT COUNT(*) FROM performance_events WHERE profile=student_profiles.id AND kind='assessment');

CREATE TRIGGER count_profile_event AFTER INSERT ON performance_events
BEGIN
  UPDATE student_profiles SET event_count=event_count+1,evidence_count=evidence_count+(NEW.kind='assessment') WHERE id=NEW.profile;
END;
CREATE TRIGGER uncount_profile_event AFTER DELETE ON performance_events
BEGIN
  UPDATE student_profiles SET event_count=event_count-1,evidence_count=evidence_count-(OLD.kind='assessment') WHERE id=OLD.profile;
END;
CREATE INDEX profile_pacing_history ON pathway_status_history(profile_id);
CREATE TRIGGER delete_profile_pacing_history AFTER DELETE ON student_profiles
BEGIN
  DELETE FROM pathway_status_history WHERE profile_id=OLD.id;
END;
