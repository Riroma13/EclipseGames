CREATE TABLE avatar_profile_versions (
  profile_student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  face_id TEXT NOT NULL CHECK (face_id IN ('face-human', 'face-fox', 'face-owl', 'face-cat', 'face-wolf')),
  skin_tone_id TEXT NOT NULL CHECK (skin_tone_id IN ('skin-light', 'skin-medium-light', 'skin-medium', 'skin-medium-dark', 'skin-dark')),
  hair_id TEXT NOT NULL CHECK (hair_id IN ('hair-none', 'hair-short', 'hair-curly', 'hair-long')),
  feature_id TEXT NOT NULL CHECK (feature_id IN ('feature-none', 'feature-glasses', 'feature-freckles')),
  clothing_id TEXT NOT NULL CHECK (clothing_id IN ('clothing-eclipse', 'clothing-field')),
  accessory_id TEXT NOT NULL CHECK (accessory_id IN ('accessory-none', 'accessory-pin')),
  frame_id TEXT NOT NULL CHECK (frame_id IN ('frame-none', 'frame-orbit')),
  background_id TEXT NOT NULL CHECK (background_id IN ('background-eclipse', 'background-night')),
  operation TEXT NOT NULL CHECK (operation IN ('BACKFILL', 'CREATE', 'UPDATE', 'REVERT')),
  reverted_from_revision INTEGER,
  reason TEXT,
  actor_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (profile_student_id, revision),
  CHECK ((operation = 'REVERT' AND reverted_from_revision IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (operation <> 'REVERT' AND reverted_from_revision IS NULL AND reason IS NULL))
);

CREATE INDEX idx_avatar_profile_versions_student_created
  ON avatar_profile_versions (profile_student_id, created_at, revision);

CREATE TABLE avatar_profiles (
  student_id TEXT PRIMARY KEY NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  current_revision INTEGER NOT NULL CHECK (current_revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id, current_revision) REFERENCES avatar_profile_versions(profile_student_id, revision) ON DELETE RESTRICT
);

CREATE TABLE avatar_profile_requests (
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'REVERT')),
  fingerprint TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  resulting_revision INTEGER,
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner_teacher_id, idempotency_key)
);

CREATE INDEX idx_avatar_profile_requests_student_created
  ON avatar_profile_requests (student_id, created_at);

INSERT INTO avatar_profile_versions (
  profile_student_id, revision, face_id, skin_tone_id, hair_id, feature_id,
  clothing_id, accessory_id, frame_id, background_id, operation,
  reverted_from_revision, reason, actor_teacher_id, created_at
)
SELECT s.id, 1,
  CASE s.avatar WHEN 'default' THEN 'face-human' ELSE 'face-' || s.avatar END,
  'skin-medium', CASE s.avatar WHEN 'default' THEN 'hair-short' ELSE 'hair-none' END,
  'feature-none', 'clothing-eclipse', 'accessory-none', 'frame-none',
  'background-eclipse', 'BACKFILL', NULL, NULL, y.owner_teacher_id, s.created_at
FROM students s
JOIN groups g ON g.id = s.group_id
JOIN academic_years y ON y.id = g.academic_year_id;

INSERT INTO avatar_profiles (student_id, current_revision, created_at, updated_at)
SELECT id, 1, created_at, created_at FROM students;
