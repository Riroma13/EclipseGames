CREATE TABLE classroom_events (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED')),
  show_on_projection INTEGER NOT NULL DEFAULT 0 CHECK (show_on_projection IN (0, 1)),
  theme TEXT NOT NULL DEFAULT 'MISSION' CHECK (theme IN ('MISSION', 'NARRATIVE', 'CELEBRATION')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT,
  completed_at TEXT,
  archived_at TEXT
);

CREATE INDEX idx_classroom_events_group_status_updated
  ON classroom_events (group_id, status, updated_at, id);

CREATE TABLE classroom_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  target INTEGER NOT NULL CHECK (target > 0),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= target),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED')),
  show_on_projection INTEGER NOT NULL DEFAULT 0 CHECK (show_on_projection IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT,
  completed_at TEXT,
  archived_at TEXT
);

CREATE INDEX idx_classroom_challenges_group_status_updated
  ON classroom_challenges (group_id, status, updated_at, id);

CREATE TABLE minigame_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('RANDOM_DRAW', 'FRENCH_SPRINT')),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  prompt TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  status TEXT NOT NULL CHECK (status IN ('READY', 'RUNNING', 'PAUSED', 'ENDED')),
  remaining_seconds INTEGER NOT NULL DEFAULT 0 CHECK (remaining_seconds >= 0),
  started_at TEXT,
  paused_at TEXT,
  selected_student_id TEXT REFERENCES students(id) ON DELETE RESTRICT,
  draw_order TEXT NOT NULL DEFAULT '[]',
  draw_index INTEGER NOT NULL DEFAULT 0 CHECK (draw_index >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_minigame_active_group
  ON minigame_sessions (group_id)
  WHERE status IN ('READY', 'RUNNING', 'PAUSED');

CREATE INDEX idx_minigame_sessions_group_updated
  ON minigame_sessions (group_id, updated_at, id);
