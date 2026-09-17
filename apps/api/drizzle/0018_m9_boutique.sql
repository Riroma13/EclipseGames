ALTER TABLE avatar_profile_versions RENAME TO avatar_profile_versions_0017;
ALTER TABLE avatar_profiles RENAME TO avatar_profiles_0017;
DROP INDEX idx_avatar_profile_versions_student_created;

CREATE TABLE avatar_profile_versions (
  profile_student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  face_id TEXT NOT NULL CHECK (face_id IN ('face-human', 'face-fox', 'face-owl', 'face-cat', 'face-wolf')),
  skin_tone_id TEXT NOT NULL CHECK (skin_tone_id IN ('skin-light', 'skin-medium-light', 'skin-medium', 'skin-medium-dark', 'skin-dark')),
  hair_id TEXT NOT NULL CHECK (hair_id IN ('hair-none', 'hair-short', 'hair-curly', 'hair-long', 'hair-braids')),
  feature_id TEXT NOT NULL CHECK (feature_id IN ('feature-none', 'feature-glasses', 'feature-freckles', 'feature-eclipse-mark')),
  clothing_id TEXT NOT NULL CHECK (clothing_id IN ('clothing-eclipse', 'clothing-field', 'clothing-orbit')),
  accessory_id TEXT NOT NULL CHECK (accessory_id IN ('accessory-none', 'accessory-pin', 'accessory-comet', 'accessory-signal', 'accessory-compass', 'accessory-anchor', 'accessory-alliance')),
  frame_id TEXT NOT NULL CHECK (frame_id IN ('frame-none', 'frame-orbit', 'frame-emerald')),
  background_id TEXT NOT NULL CHECK (background_id IN ('background-eclipse', 'background-night', 'background-dawn')),
  operation TEXT NOT NULL CHECK (operation IN ('BACKFILL', 'CREATE', 'UPDATE', 'REVERT')),
  reverted_from_revision INTEGER,
  reason TEXT,
  actor_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (profile_student_id, revision),
  CHECK ((operation = 'REVERT' AND reverted_from_revision IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) BETWEEN 1 AND 500) OR (operation <> 'REVERT' AND reverted_from_revision IS NULL AND reason IS NULL))
);
CREATE INDEX idx_avatar_profile_versions_student_created ON avatar_profile_versions (profile_student_id, created_at, revision);

CREATE TABLE avatar_profiles (
  student_id TEXT PRIMARY KEY NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  current_revision INTEGER NOT NULL CHECK (current_revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id, current_revision) REFERENCES avatar_profile_versions(profile_student_id, revision) ON DELETE RESTRICT
);
INSERT INTO avatar_profile_versions SELECT * FROM avatar_profile_versions_0017;
INSERT INTO avatar_profiles SELECT * FROM avatar_profiles_0017;
DROP TABLE avatar_profiles_0017;
DROP TABLE avatar_profile_versions_0017;

CREATE TABLE boutique_purchases (
  id TEXT PRIMARY KEY NOT NULL,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  term_id TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL CHECK (item_id IN ('hair-braids', 'feature-eclipse-mark', 'clothing-orbit', 'accessory-comet', 'accessory-signal', 'accessory-compass', 'accessory-anchor', 'accessory-alliance', 'frame-emerald', 'background-dawn')),
  catalogue_version TEXT NOT NULL CHECK (length(trim(catalogue_version)) > 0),
  currency TEXT NOT NULL CHECK (currency = 'EMERALD'),
  cost INTEGER NOT NULL CHECK (cost BETWEEN 1 AND 3),
  min_level INTEGER NOT NULL CHECK (min_level >= 1),
  required_specialty_category TEXT CHECK (required_specialty_category IS NULL OR required_specialty_category IN ('COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION')),
  available_from_term TEXT NOT NULL CHECK (available_from_term IN ('T1', 'T2', 'T3')),
  level_at_purchase INTEGER NOT NULL CHECK (level_at_purchase >= 1),
  specialty_category_at_purchase TEXT,
  purchased_at TEXT NOT NULL,
  actor_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  UNIQUE (student_id, academic_year_id, item_id),
  CHECK (length(trim(id)) > 0),
  CHECK (specialty_category_at_purchase IS NULL OR specialty_category_at_purchase IN ('COMMUNICATION', 'PRECISION', 'CONSISTENCY', 'COLLABORATION'))
);
CREATE INDEX idx_boutique_purchases_student_year ON boutique_purchases (student_id, academic_year_id, purchased_at, id);
CREATE INDEX idx_boutique_purchases_owner_year ON boutique_purchases (owner_teacher_id, academic_year_id, purchased_at, id);

CREATE TABLE boutique_purchase_requests (
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation = 'PURCHASE'),
  fingerprint TEXT NOT NULL CHECK (length(trim(fingerprint)) > 0),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  item_id TEXT NOT NULL,
  term_id TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE RESTRICT,
  purchase_id TEXT NOT NULL UNIQUE REFERENCES boutique_purchases(id) ON DELETE RESTRICT,
  resulting_emerald_balance INTEGER NOT NULL CHECK (resulting_emerald_balance >= 0),
  created_at TEXT NOT NULL,
  PRIMARY KEY (owner_teacher_id, idempotency_key),
  CHECK (length(trim(idempotency_key)) > 0)
);
CREATE INDEX idx_boutique_purchase_requests_student_created ON boutique_purchase_requests (student_id, academic_year_id, created_at);

CREATE TABLE boutique_spend_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_id TEXT NOT NULL REFERENCES boutique_purchases(id) ON DELETE RESTRICT,
  funding_movement_id TEXT NOT NULL REFERENCES gem_ledger(id) ON DELETE RESTRICT,
  spend_movement_id TEXT NOT NULL UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  UNIQUE (purchase_id, funding_movement_id),
  UNIQUE (funding_movement_id)
);
CREATE INDEX idx_boutique_spend_allocations_funding ON boutique_spend_allocations (funding_movement_id);
