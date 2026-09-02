CREATE TABLE classroom_challenges_v8 (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  target INTEGER NOT NULL CHECK (target > 0),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= target),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED')),
  show_on_projection INTEGER NOT NULL DEFAULT 0 CHECK (show_on_projection IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  activated_at TEXT,
  completed_at TEXT,
  archived_at TEXT
);

INSERT INTO classroom_challenges_v8 (
  id, owner_teacher_id, group_id, title, description, target, progress, status,
  show_on_projection, created_at, updated_at, activated_at, completed_at, archived_at
)
SELECT
  id, owner_teacher_id, group_id, title, description, target, progress, status,
  show_on_projection, created_at, updated_at, activated_at, completed_at, archived_at
FROM classroom_challenges;

DROP TABLE classroom_challenges;
ALTER TABLE classroom_challenges_v8 RENAME TO classroom_challenges;

CREATE INDEX idx_classroom_challenges_group_status_updated
  ON classroom_challenges (group_id, status, updated_at, id);

CREATE TABLE minigame_sessions_v8 (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('RANDOM_DRAW', 'FRENCH_SPRINT', 'TEAM_DRAW', 'PROMPT_DECK')),
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
  updated_at TEXT NOT NULL,
  team_count INTEGER NOT NULL DEFAULT 0 CHECK (team_count >= 0),
  team_assignments TEXT NOT NULL DEFAULT '{}',
  prompt_deck_prompts TEXT NOT NULL DEFAULT '[]'
);

INSERT INTO minigame_sessions_v8 (
  id, owner_teacher_id, group_id, kind, title, prompt, duration_seconds, status,
  remaining_seconds, started_at, paused_at, selected_student_id, draw_order,
  draw_index, created_at, updated_at, team_count, team_assignments, prompt_deck_prompts
)
SELECT
  id, owner_teacher_id, group_id, kind, title, prompt, duration_seconds, status,
  remaining_seconds, started_at, paused_at, selected_student_id, draw_order,
  draw_index, created_at, updated_at, 0, '{}', '[]'
FROM minigame_sessions;

DROP TABLE minigame_sessions;
ALTER TABLE minigame_sessions_v8 RENAME TO minigame_sessions;

CREATE UNIQUE INDEX uq_minigame_active_group
  ON minigame_sessions (group_id)
  WHERE status IN ('READY', 'RUNNING', 'PAUSED');

CREATE INDEX idx_minigame_sessions_group_updated
  ON minigame_sessions (group_id, updated_at, id);

ALTER TABLE coin_ledger ADD COLUMN owner_teacher_id TEXT REFERENCES teacher_accounts(id) ON DELETE RESTRICT;
ALTER TABLE coin_ledger ADD COLUMN client_request_id TEXT;
ALTER TABLE coin_ledger ADD COLUMN request_fingerprint TEXT;

CREATE UNIQUE INDEX uq_coin_ledger_owner_request
  ON coin_ledger (owner_teacher_id, client_request_id)
  WHERE owner_teacher_id IS NOT NULL AND client_request_id IS NOT NULL;

CREATE UNIQUE INDEX uq_coin_ledger_manual_correction_target
  ON coin_ledger (correction_of_id)
  WHERE source = 'MANUAL_CORRECTION';

CREATE TABLE minigame_presets (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  prompt TEXT NOT NULL CHECK (length(trim(prompt)) > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 10 AND 600),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_minigame_presets_owner_archive_updated
  ON minigame_presets (owner_teacher_id, archived_at, updated_at, id);

CREATE TABLE prompt_decks (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  prompts TEXT NOT NULL CHECK (length(trim(prompts)) > 2),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_prompt_decks_owner_archive_updated
  ON prompt_decks (owner_teacher_id, archived_at, updated_at, id);
