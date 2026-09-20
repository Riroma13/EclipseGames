CREATE TABLE narrative_group_state (
  group_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (group_id, academic_year_id),
  UNIQUE (group_id, academic_year_id, owner_teacher_id),
  FOREIGN KEY (group_id, academic_year_id, owner_teacher_id)
    REFERENCES groups(id, academic_year_id, owner_teacher_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX uq_narrative_group_state_lineage
  ON narrative_group_state (group_id, academic_year_id, owner_teacher_id);
CREATE INDEX idx_narrative_group_state_owner_year
  ON narrative_group_state (owner_teacher_id, academic_year_id, group_id);

CREATE TABLE narrative_group_events (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 9),
  term TEXT NOT NULL CHECK (term IN ('T1', 'T2', 'T3')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  revealed_clue_count INTEGER NOT NULL DEFAULT 0 CHECK (revealed_clue_count >= 0),
  mechanic_kind TEXT,
  mechanic_id TEXT,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  updated_at TEXT NOT NULL,
  UNIQUE (owner_teacher_id, group_id, academic_year_id, event_key),
  UNIQUE (owner_teacher_id, group_id, academic_year_id, ordinal),
  FOREIGN KEY (group_id, academic_year_id, owner_teacher_id)
    REFERENCES narrative_group_state(group_id, academic_year_id, owner_teacher_id) ON DELETE CASCADE,
  CHECK (mechanic_kind IS NULL OR mechanic_kind IN ('CHALLENGE', 'MINIGAME')),
  CHECK ((mechanic_kind IS NULL AND mechanic_id IS NULL) OR (mechanic_kind IS NOT NULL AND mechanic_id IS NOT NULL))
);
CREATE INDEX idx_narrative_group_events_lineage
  ON narrative_group_events (owner_teacher_id, group_id, academic_year_id, ordinal);
CREATE INDEX idx_narrative_group_events_revision
  ON narrative_group_events (owner_teacher_id, group_id, academic_year_id, revision);

CREATE TABLE narrative_command_requests (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  owner_teacher_id TEXT NOT NULL,
  command TEXT NOT NULL CHECK (command IN ('START', 'REVEAL_NEXT_CLUE', 'LINK', 'COMPLETE')),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  request_fingerprint TEXT NOT NULL CHECK (length(request_fingerprint) = 64),
  event_key TEXT NOT NULL,
  resulting_revision INTEGER NOT NULL CHECK (resulting_revision >= 0),
  response_status INTEGER NOT NULL CHECK (response_status BETWEEN 200 AND 299),
  response_body_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (owner_teacher_id, group_id, academic_year_id, command, idempotency_key),
  FOREIGN KEY (group_id, academic_year_id, owner_teacher_id)
    REFERENCES narrative_group_state(group_id, academic_year_id, owner_teacher_id) ON DELETE CASCADE
);
CREATE INDEX idx_narrative_command_requests_event
  ON narrative_command_requests (owner_teacher_id, group_id, academic_year_id, event_key, created_at);
