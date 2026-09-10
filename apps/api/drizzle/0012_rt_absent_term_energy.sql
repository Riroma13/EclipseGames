CREATE UNIQUE INDEX uq_real_sessions_lineage ON real_class_sessions (id, owner_teacher_id, academic_year_id, group_id, term_id);
CREATE UNIQUE INDEX uq_students_id_group ON students (id, group_id);
CREATE TABLE real_class_session_rt_roster (
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  PRIMARY KEY (session_id, student_id),
  FOREIGN KEY (session_id, owner_teacher_id, academic_year_id, group_id, term_id) REFERENCES real_class_sessions(id, owner_teacher_id, academic_year_id, group_id, term_id) ON DELETE RESTRICT,
  FOREIGN KEY (student_id, group_id) REFERENCES students(id, group_id) ON DELETE RESTRICT
);
CREATE TABLE rt_entries (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK (value IN ('10', '5', '0', 'ABSENT')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (session_id, student_id),
  UNIQUE (id, student_id, term_id),
  FOREIGN KEY (session_id, student_id) REFERENCES real_class_session_rt_roster(session_id, student_id) ON DELETE RESTRICT
);
CREATE TABLE rt_requests (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('BULK_UPSERT')),
  session_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (owner_teacher_id, idempotency_key),
  FOREIGN KEY (session_id) REFERENCES real_class_sessions(id) ON DELETE RESTRICT
);
CREATE TABLE rt_streak_emerald_entitlements (
  id TEXT PRIMARY KEY NOT NULL,
  source_key TEXT NOT NULL UNIQUE,
  source_entry_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  revision INTEGER NOT NULL CHECK (revision >= 1),
  consumer_id TEXT,
  grant_id TEXT,
  consumed_revision INTEGER,
  consumed_at TEXT,
  FOREIGN KEY (source_entry_id, student_id, term_id) REFERENCES rt_entries(id, student_id, term_id) ON DELETE RESTRICT,
  CHECK ((consumer_id IS NULL AND grant_id IS NULL AND consumed_revision IS NULL AND consumed_at IS NULL) OR (consumer_id IS NOT NULL AND grant_id IS NOT NULL AND consumed_revision IS NOT NULL AND consumed_at IS NOT NULL))
);
CREATE INDEX idx_rt_entries_student_term_order ON rt_entries(student_id, term_id, created_at, id);
CREATE INDEX idx_rt_entitlements_student_term ON rt_streak_emerald_entitlements(student_id, term_id, id);
