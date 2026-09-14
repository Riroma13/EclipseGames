ALTER TABLE xp_evidence_events ADD COLUMN real_class_session_id TEXT;
ALTER TABLE xp_evidence_events ADD COLUMN term_id TEXT;
CREATE UNIQUE INDEX uq_real_sessions_identity_lineage ON real_class_sessions (id, owner_teacher_id, academic_year_id, term_id);
CREATE INDEX idx_xp_events_term_category_active ON xp_evidence_events (student_id, academic_year_id, term_id, category);
-- SQLite cannot add a table-level composite FK with ALTER TABLE. These triggers
-- provide the same nullable composite-FK enforcement without rebuilding the
-- legacy XP table (and therefore without inferring or backfilling attribution).
CREATE TRIGGER fk_xp_events_real_session_lineage_insert
BEFORE INSERT ON xp_evidence_events
WHEN NEW.real_class_session_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM real_class_sessions WHERE id = NEW.real_class_session_id AND owner_teacher_id = NEW.owner_teacher_id AND academic_year_id = NEW.academic_year_id AND term_id = NEW.term_id)
BEGIN
  SELECT RAISE(ABORT, 'FOREIGN KEY constraint failed');
END;
CREATE TRIGGER fk_xp_events_real_session_lineage_update
BEFORE UPDATE OF real_class_session_id, owner_teacher_id, academic_year_id, term_id ON xp_evidence_events
WHEN NEW.real_class_session_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM real_class_sessions WHERE id = NEW.real_class_session_id AND owner_teacher_id = NEW.owner_teacher_id AND academic_year_id = NEW.academic_year_id AND term_id = NEW.term_id)
BEGIN
  SELECT RAISE(ABORT, 'FOREIGN KEY constraint failed');
END;
CREATE TABLE observation_rubric_evaluations (
  id TEXT PRIMARY KEY NOT NULL, student_id TEXT NOT NULL, term_id TEXT NOT NULL, calendar_id TEXT NOT NULL,
  owner_teacher_id TEXT NOT NULL, academic_year_id TEXT NOT NULL, group_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('OPEN','CLOSED','REOPENED')), revision INTEGER NOT NULL CHECK (revision >= 0),
  communication_override INTEGER CHECK (communication_override IS NULL OR communication_override BETWEEN 1 AND 4),
  precision_override INTEGER CHECK (precision_override IS NULL OR precision_override BETWEEN 1 AND 4),
  consistency_override INTEGER CHECK (consistency_override IS NULL OR consistency_override BETWEEN 1 AND 4),
  collaboration_override INTEGER CHECK (collaboration_override IS NULL OR collaboration_override BETWEEN 1 AND 4),
  draft_comment TEXT CHECK (draft_comment IS NULL OR length(draft_comment) <= 2000), current_snapshot_version INTEGER,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE (student_id, term_id), UNIQUE (id, owner_teacher_id, academic_year_id, group_id, term_id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (student_id, group_id) REFERENCES students(id, group_id),
  FOREIGN KEY (group_id, academic_year_id, owner_teacher_id) REFERENCES groups(id, academic_year_id, owner_teacher_id),
  FOREIGN KEY (term_id, calendar_id, academic_year_id, owner_teacher_id) REFERENCES academic_terms(id, calendar_id, academic_year_id, owner_teacher_id)
);
CREATE TABLE observation_rubric_snapshots (
  id TEXT PRIMARY KEY NOT NULL, evaluation_id TEXT NOT NULL, version INTEGER NOT NULL,
  communication_suggested INTEGER NOT NULL CHECK (communication_suggested BETWEEN 1 AND 4), precision_suggested INTEGER NOT NULL CHECK (precision_suggested BETWEEN 1 AND 4), consistency_suggested INTEGER NOT NULL CHECK (consistency_suggested BETWEEN 1 AND 4), collaboration_suggested INTEGER NOT NULL CHECK (collaboration_suggested BETWEEN 1 AND 4),
  communication_final INTEGER NOT NULL CHECK (communication_final BETWEEN 1 AND 4), precision_final INTEGER NOT NULL CHECK (precision_final BETWEEN 1 AND 4), consistency_final INTEGER NOT NULL CHECK (consistency_final BETWEEN 1 AND 4), collaboration_final INTEGER NOT NULL CHECK (collaboration_final BETWEEN 1 AND 4),
  communication_base_xp INTEGER NOT NULL CHECK (communication_base_xp >= 0), precision_base_xp INTEGER NOT NULL CHECK (precision_base_xp >= 0), consistency_base_xp INTEGER NOT NULL CHECK (consistency_base_xp >= 0), collaboration_base_xp INTEGER NOT NULL CHECK (collaboration_base_xp >= 0), communication_event_count INTEGER NOT NULL CHECK (communication_event_count >= 0), precision_event_count INTEGER NOT NULL CHECK (precision_event_count >= 0), consistency_event_count INTEGER NOT NULL CHECK (consistency_event_count >= 0), collaboration_event_count INTEGER NOT NULL CHECK (collaboration_event_count >= 0), has_low_evidence INTEGER NOT NULL CHECK (has_low_evidence IN (0,1)), level_sum INTEGER NOT NULL CHECK (level_sum BETWEEN 4 AND 16), grade_milli INTEGER NOT NULL CHECK (grade_milli = level_sum * 625), comment TEXT CHECK (comment IS NULL OR length(comment) <= 2000), closed_at TEXT NOT NULL, closed_by_teacher_id TEXT NOT NULL, prior_version INTEGER, UNIQUE (evaluation_id, version), FOREIGN KEY (evaluation_id) REFERENCES observation_rubric_evaluations(id)
);
CREATE TABLE observation_rubric_snapshot_evidence (snapshot_id TEXT NOT NULL, xp_event_id TEXT NOT NULL, category TEXT NOT NULL, base_xp INTEGER NOT NULL CHECK (base_xp >= 0), PRIMARY KEY (snapshot_id, xp_event_id), FOREIGN KEY (snapshot_id) REFERENCES observation_rubric_snapshots(id), FOREIGN KEY (xp_event_id) REFERENCES xp_evidence_events(id));
CREATE TABLE observation_rubric_lifecycle_events (id TEXT PRIMARY KEY NOT NULL, evaluation_id TEXT NOT NULL, operation TEXT NOT NULL CHECK (operation IN ('CLOSE','REOPEN')), resulting_revision INTEGER NOT NULL, resulting_state TEXT NOT NULL, snapshot_version INTEGER, reason TEXT, actor_teacher_id TEXT NOT NULL, occurred_at TEXT NOT NULL, FOREIGN KEY (evaluation_id) REFERENCES observation_rubric_evaluations(id));
CREATE TABLE observation_rubric_requests (id TEXT PRIMARY KEY NOT NULL, owner_teacher_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, operation TEXT NOT NULL, fingerprint TEXT NOT NULL, evaluation_id TEXT, resulting_revision INTEGER, snapshot_version INTEGER, created_at TEXT NOT NULL, UNIQUE (owner_teacher_id, idempotency_key));
CREATE INDEX idx_rubric_evaluations_owner_year_group ON observation_rubric_evaluations (owner_teacher_id, academic_year_id, group_id, term_id);
CREATE INDEX idx_rubric_lifecycle_evaluation ON observation_rubric_lifecycle_events (evaluation_id, occurred_at);
