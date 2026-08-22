CREATE TABLE academic_years (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  label TEXT NOT NULL CHECK (length(trim(label)) > 0),
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (starts_on < ends_on),
  UNIQUE (owner_teacher_id, label COLLATE NOCASE)
);

CREATE INDEX idx_academic_years_owner_archive_start
  ON academic_years (owner_teacher_id, archived_at, starts_on);

CREATE TABLE groups (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL,
  UNIQUE (academic_year_id, name COLLATE NOCASE)
);

CREATE INDEX idx_groups_owner_year ON groups (owner_teacher_id, academic_year_id);

CREATE TABLE students (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  real_name TEXT NOT NULL CHECK (length(trim(real_name)) > 0),
  alias TEXT NOT NULL CHECK (length(trim(alias)) > 0),
  avatar TEXT NOT NULL CHECK (avatar IN ('default', 'fox', 'owl', 'cat', 'wolf')),
  specialty TEXT CHECK (specialty IS NULL OR specialty IN (
    'Leader', 'Diplomat', 'Strategist', 'Analyst',
    'Disciplined', 'Perseverant', 'Helper', 'Ally'
  )),
  archived_at TEXT,
  group_correction_locked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX uq_students_active_group_alias
  ON students (group_id, alias COLLATE NOCASE)
  WHERE archived_at IS NULL;

CREATE INDEX idx_students_group_archive_alias_id
  ON students (group_id, archived_at, alias, id);
