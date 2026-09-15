CREATE TABLE group_term_closures (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('OPEN', 'CLOSED', 'REOPENED')),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  current_snapshot_version INTEGER CHECK (current_snapshot_version IS NULL OR current_snapshot_version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (group_id, academic_year_id, term_id),
  UNIQUE (id, owner_teacher_id, academic_year_id, group_id, calendar_id, term_id),
  FOREIGN KEY (owner_teacher_id) REFERENCES teacher_accounts(id),
  FOREIGN KEY (group_id, academic_year_id, owner_teacher_id) REFERENCES groups(id, academic_year_id, owner_teacher_id),
  FOREIGN KEY (term_id, calendar_id, academic_year_id, owner_teacher_id) REFERENCES academic_terms(id, calendar_id, academic_year_id, owner_teacher_id)
);

CREATE TABLE group_term_close_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  closure_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  prior_version INTEGER CHECK (prior_version IS NULL OR (prior_version > 0 AND version = prior_version + 1)),
  cohort_count INTEGER NOT NULL CHECK (cohort_count >= 0),
  closed_by_teacher_id TEXT NOT NULL,
  closed_at TEXT NOT NULL,
  xlsx_bytes BLOB NOT NULL,
  xlsx_sha256 TEXT NOT NULL CHECK (length(xlsx_sha256) = 64),
  xlsx_length INTEGER NOT NULL CHECK (xlsx_length >= 0),
  UNIQUE (closure_id, version),
  FOREIGN KEY (closure_id) REFERENCES group_term_closures(id),
  FOREIGN KEY (closed_by_teacher_id) REFERENCES teacher_accounts(id)
);

CREATE TABLE group_term_close_students (
  id TEXT PRIMARY KEY NOT NULL,
  snapshot_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0),
  real_name TEXT NOT NULL,
  evaluation_id TEXT NOT NULL,
  evaluation_snapshot_version INTEGER NOT NULL CHECK (evaluation_snapshot_version > 0),
  grade_milli INTEGER NOT NULL CHECK (grade_milli BETWEEN 0 AND 10000),
  rt_sum INTEGER CHECK (rt_sum IS NULL OR rt_sum >= 0),
  rt_evaluated_count INTEGER NOT NULL CHECK (rt_evaluated_count >= 0),
  CHECK ((rt_sum IS NULL AND rt_evaluated_count = 0) OR (rt_sum IS NOT NULL AND rt_evaluated_count > 0)),
  UNIQUE (snapshot_id, ordinal),
  UNIQUE (snapshot_id, student_id),
  FOREIGN KEY (snapshot_id) REFERENCES group_term_close_snapshots(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE group_term_close_rt_evidence (
  id TEXT PRIMARY KEY NOT NULL,
  snapshot_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK (value IN ('10', '5', '0', 'ABSENT')),
  UNIQUE (snapshot_id, student_id, entry_id),
  FOREIGN KEY (snapshot_id, student_id) REFERENCES group_term_close_students(snapshot_id, student_id)
);

CREATE TABLE group_term_close_lifecycle_events (
  id TEXT PRIMARY KEY NOT NULL,
  closure_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('CLOSE', 'REOPEN')),
  resulting_revision INTEGER NOT NULL CHECK (resulting_revision >= 0),
  resulting_state TEXT NOT NULL CHECK (resulting_state IN ('OPEN', 'CLOSED', 'REOPENED')),
  snapshot_version INTEGER,
  reason TEXT,
  actor_teacher_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (closure_id) REFERENCES group_term_closures(id),
  FOREIGN KEY (actor_teacher_id) REFERENCES teacher_accounts(id)
);

CREATE TABLE group_term_close_requests (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('CLOSE', 'REOPEN')),
  closure_id TEXT,
  fingerprint TEXT NOT NULL,
  resulting_revision INTEGER,
  snapshot_version INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (owner_teacher_id, idempotency_key),
  FOREIGN KEY (owner_teacher_id) REFERENCES teacher_accounts(id),
  FOREIGN KEY (closure_id) REFERENCES group_term_closures(id)
);

CREATE INDEX idx_group_term_close_snapshots_closure_version ON group_term_close_snapshots (closure_id, version);
CREATE INDEX idx_group_term_close_students_snapshot_ordinal ON group_term_close_students (snapshot_id, ordinal);
CREATE INDEX idx_group_term_close_lifecycle_closure_occurred ON group_term_close_lifecycle_events (closure_id, occurred_at);
