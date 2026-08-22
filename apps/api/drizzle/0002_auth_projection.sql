CREATE TABLE teacher_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE projection_students (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id),
  avatar TEXT NOT NULL,
  alias TEXT NOT NULL,
  specialty TEXT NOT NULL,
  unlocked_badge TEXT,
  xp_level INTEGER NOT NULL,
  progress_to_next_level INTEGER NOT NULL,
  energy_visual_state TEXT NOT NULL,
  coin_balance INTEGER NOT NULL,
  narrative_progress INTEGER NOT NULL,
  behaviour_state TEXT NOT NULL,
  real_name TEXT NOT NULL,
  rt_average REAL,
  rubric TEXT NOT NULL,
  observation_grade REAL,
  xp_breakdown TEXT NOT NULL,
  comments TEXT NOT NULL,
  incidents TEXT NOT NULL,
  red_codes TEXT NOT NULL,
  disciplinary_history TEXT NOT NULL,
  detailed_history TEXT NOT NULL
);
