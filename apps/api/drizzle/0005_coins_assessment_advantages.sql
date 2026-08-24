ALTER TABLE xp_level_grant_transitions ADD COLUMN source_transition_id TEXT;
CREATE UNIQUE INDEX uq_xp_grant_transition_source ON xp_level_grant_transitions (source_transition_id) WHERE source_transition_id IS NOT NULL;

CREATE TABLE coin_ledger (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  source TEXT NOT NULL,
  correction_of_id TEXT REFERENCES coin_ledger(id) ON DELETE RESTRICT,
  redemption_id TEXT,
  source_transition_id TEXT UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_coin_ledger_student_year_created ON coin_ledger (student_id, academic_year_id, created_at, id);
CREATE UNIQUE INDEX uq_coin_ledger_refund_redemption ON coin_ledger (redemption_id) WHERE source = 'REDEMPTION_REFUND';

CREATE TABLE assessment_contexts (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_assessment_contexts_group_archive ON assessment_contexts (group_id, archived_at, id);

CREATE TABLE coin_rewards (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  cost INTEGER NOT NULL CHECK (cost IN (2,3)),
  type TEXT NOT NULL CHECK (type = 'ASSESSMENT_ADVANTAGE')
);

CREATE TABLE advantage_redemptions (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  assessment_context_id TEXT NOT NULL REFERENCES assessment_contexts(id) ON DELETE RESTRICT,
  reward_id TEXT NOT NULL REFERENCES coin_rewards(id) ON DELETE RESTRICT,
  cost INTEGER NOT NULL CHECK (cost IN (2,3)),
  debit_ledger_id TEXT NOT NULL REFERENCES coin_ledger(id) ON DELETE RESTRICT,
  reversal_ledger_id TEXT REFERENCES coin_ledger(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  reversed_at TEXT,
  owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
  client_request_id TEXT,
  request_fingerprint TEXT
);
CREATE UNIQUE INDEX uq_advantage_redemptions_context_student ON advantage_redemptions (student_id, assessment_context_id);
CREATE UNIQUE INDEX uq_advantage_redemptions_reversal ON advantage_redemptions (reversal_ledger_id) WHERE reversal_ledger_id IS NOT NULL;
CREATE UNIQUE INDEX uq_advantage_redemptions_request ON advantage_redemptions (owner_teacher_id, client_request_id) WHERE client_request_id IS NOT NULL;

CREATE TABLE coin_spend_allocations (
  id TEXT PRIMARY KEY NOT NULL,
  redemption_id TEXT NOT NULL REFERENCES advantage_redemptions(id) ON DELETE RESTRICT,
  grant_ledger_entry_id TEXT NOT NULL REFERENCES coin_ledger(id) ON DELETE RESTRICT,
  released_at TEXT,
  release_reason TEXT CHECK (release_reason IS NULL OR release_reason = 'REDEMPTION_REVERSED'),
  created_at TEXT NOT NULL,
  UNIQUE (redemption_id, grant_ledger_entry_id)
);
CREATE UNIQUE INDEX uq_coin_allocations_active_grant ON coin_spend_allocations (grant_ledger_entry_id) WHERE released_at IS NULL;
CREATE INDEX idx_coin_allocations_redemption_active ON coin_spend_allocations (redemption_id, released_at, created_at, id);
CREATE INDEX idx_coin_allocations_grant ON coin_spend_allocations (grant_ledger_entry_id, released_at, id);

INSERT INTO coin_rewards (id, name, cost, type) VALUES
  ('standard-assessment-advantage', 'Standard assessment advantage', 2, 'ASSESSMENT_ADVANTAGE'),
  ('exceptional-assessment-advantage', 'Exceptional assessment advantage', 3, 'ASSESSMENT_ADVANTAGE');
