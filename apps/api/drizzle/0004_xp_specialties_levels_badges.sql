CREATE TABLE xp_evidence_events (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('COMMUNICATION','PRECISION','CONSISTENCY','COLLABORATION')),
  base_xp INTEGER NOT NULL CHECK (base_xp IN (1,2,3)),
  specialty_at_award TEXT,
  specialty_category_at_award TEXT,
  bonus_eligible_at_award INTEGER NOT NULL CHECK (bonus_eligible_at_award IN (0,1)),
  specialty_bonus_xp INTEGER NOT NULL CHECK (specialty_bonus_xp IN (0,1)),
  effective_xp INTEGER NOT NULL CHECK (effective_xp = base_xp + specialty_bonus_xp),
  comment TEXT CHECK (comment IS NULL OR length(comment) <= 500),
  created_at TEXT NOT NULL,
  created_by_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  client_request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  UNIQUE (owner_teacher_id, client_request_id)
);
CREATE INDEX idx_xp_events_student_year_created ON xp_evidence_events (student_id, academic_year_id, created_at, id);
CREATE INDEX idx_xp_events_student_year_category ON xp_evidence_events (student_id, academic_year_id, category, created_at, id);

CREATE TABLE xp_evidence_reversals (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  target_event_id TEXT NOT NULL REFERENCES xp_evidence_events(id) ON DELETE RESTRICT,
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 500),
  created_at TEXT NOT NULL,
  created_by_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  client_request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  UNIQUE (target_event_id), UNIQUE (owner_teacher_id, client_request_id)
);
CREATE INDEX idx_xp_reversals_target ON xp_evidence_reversals (target_event_id, created_at, id);

CREATE TABLE xp_level_unlocks (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  level INTEGER NOT NULL CHECK (level BETWEEN 2 AND 8),
  active INTEGER NOT NULL CHECK (active IN (0,1)),
  first_crossed_at TEXT NOT NULL,
  first_source_event_id TEXT NOT NULL REFERENCES xp_evidence_events(id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL,
  UNIQUE (student_id, academic_year_id, level)
);
CREATE INDEX idx_xp_unlocks_student_year_active ON xp_level_unlocks (student_id, academic_year_id, active);

CREATE TABLE xp_level_grant_transitions (
  id TEXT PRIMARY KEY NOT NULL,
  sequence INTEGER NOT NULL,
  unlock_id TEXT NOT NULL REFERENCES xp_level_unlocks(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('GRANT','REVOKE','REINSTATE')),
  source_event_id TEXT REFERENCES xp_evidence_events(id) ON DELETE RESTRICT,
  source_reversal_id TEXT REFERENCES xp_evidence_reversals(id) ON DELETE RESTRICT,
  occurred_at TEXT NOT NULL,
  UNIQUE (sequence),
  CHECK ((kind IN ('GRANT','REINSTATE') AND source_event_id IS NOT NULL AND source_reversal_id IS NULL) OR (kind = 'REVOKE' AND source_event_id IS NULL AND source_reversal_id IS NOT NULL))
);
CREATE UNIQUE INDEX uq_xp_grant_transition_unlock ON xp_level_grant_transitions (unlock_id) WHERE kind = 'GRANT';
CREATE INDEX idx_xp_grant_transitions_sequence ON xp_level_grant_transitions (sequence);

CREATE TABLE xp_badge_unlocks (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('COMMUNICATION','PRECISION','CONSISTENCY','COLLABORATION')),
  badge_label TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0,1)),
  first_unlocked_at TEXT NOT NULL,
  last_activated_at TEXT NOT NULL,
  last_revoked_at TEXT,
  source_event_id TEXT REFERENCES xp_evidence_events(id) ON DELETE RESTRICT,
  UNIQUE (student_id, academic_year_id, category)
);
CREATE INDEX idx_xp_badges_student_year_active ON xp_badge_unlocks (student_id, academic_year_id, active);
