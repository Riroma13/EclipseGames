CREATE TABLE gem_ledger (
 id TEXT PRIMARY KEY,
 student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
 academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
 currency TEXT NOT NULL CHECK(currency IN ('EMERALD','RUBY','DIAMOND')),
 amount INTEGER NOT NULL CHECK(amount IN (-1,1)),
 movement_kind TEXT NOT NULL CHECK(movement_kind IN ('GRANT','REVOKE','REINSTATE','CORRECTION','SPEND','SPEND_REVERSAL')),
 source_kind TEXT NOT NULL CHECK(source_kind IN ('XP_TRANSITION','RT_REVISION','RESULT_REWARD','REDEMPTION')),
 source_id TEXT NOT NULL, source_family_id TEXT NOT NULL,
 unit_index INTEGER NOT NULL CHECK(unit_index >= 1),
 correction_of_id TEXT REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 request_key TEXT, request_fingerprint TEXT, created_at TEXT NOT NULL,
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
 UNIQUE(source_kind, source_id, unit_index), UNIQUE(correction_of_id),
 CHECK((movement_kind='GRANT' AND amount=1 AND correction_of_id IS NULL AND source_kind<>'REDEMPTION') OR
       (movement_kind='REVOKE' AND amount=-1 AND correction_of_id IS NOT NULL AND source_kind IN ('XP_TRANSITION','RT_REVISION')) OR
       (movement_kind='REINSTATE' AND amount=1 AND correction_of_id IS NOT NULL AND source_kind IN ('XP_TRANSITION','RT_REVISION')) OR
       (movement_kind='CORRECTION' AND amount=-1 AND correction_of_id IS NOT NULL AND source_kind='RESULT_REWARD') OR
       (movement_kind='SPEND' AND amount=-1 AND correction_of_id IS NULL AND source_kind='REDEMPTION') OR
       (movement_kind='SPEND_REVERSAL' AND amount=1 AND correction_of_id IS NOT NULL AND source_kind='REDEMPTION'))
);
CREATE TABLE gem_reconciliation_cursors (stream TEXT PRIMARY KEY, last_sequence INTEGER NOT NULL CHECK(last_sequence >= 0), updated_at TEXT NOT NULL);
CREATE TABLE gem_xp_transition_receipts (
 transition_id TEXT PRIMARY KEY, sequence INTEGER NOT NULL UNIQUE, unlock_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('GRANT','REVOKE','REINSTATE')),
 source_event_id TEXT REFERENCES xp_evidence_events(id) ON DELETE RESTRICT,
 source_reversal_id TEXT REFERENCES xp_evidence_reversals(id) ON DELETE RESTRICT,
  movement_id TEXT NOT NULL UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
  fingerprint TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(unlock_id) REFERENCES xp_level_unlocks(id) ON DELETE RESTRICT
);
CREATE TABLE gem_reconciliation_revisions (
 receipt_operation_id TEXT PRIMARY KEY,
 entitlement_id TEXT NOT NULL REFERENCES rt_streak_emerald_entitlements(id) ON DELETE RESTRICT,
 revision INTEGER NOT NULL CHECK(revision >= 1), state TEXT NOT NULL CHECK(state IN ('ACTIVE','INACTIVE')),
 transaction_correlation_id TEXT NOT NULL, movement_id TEXT REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 revision_fingerprint TEXT NOT NULL, created_at TEXT NOT NULL,
 UNIQUE(entitlement_id, revision),
 CHECK(receipt_operation_id = 'rt-revision:' || entitlement_id || ':' || revision)
);
CREATE TABLE gem_reward_catalogue (
 id TEXT PRIMARY KEY, currency TEXT NOT NULL CHECK(currency IN ('EMERALD','RUBY','DIAMOND')),
 cost INTEGER NOT NULL CHECK(cost IN (1,2)), UNIQUE(currency),
 CHECK((currency='EMERALD' AND cost=2) OR (currency IN ('RUBY','DIAMOND') AND cost=1))
);
CREATE TABLE gem_result_rewards (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
 assessment_context_id TEXT NOT NULL REFERENCES assessment_contexts(id) ON DELETE RESTRICT,
 academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
 tier TEXT NOT NULL CHECK(tier IN ('NONE','EMERALD_1','EMERALD_2','RUBY_1','DIAMOND_1')),
 state TEXT NOT NULL CHECK(state IN ('ACTIVE','REVERSED')),
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL, UNIQUE(student_id, assessment_context_id, academic_year_id)
);
CREATE TABLE gem_result_reward_operations (
 operation_id TEXT PRIMARY KEY, reward_id TEXT NOT NULL REFERENCES gem_result_rewards(id) ON DELETE RESTRICT,
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT,
 operation TEXT NOT NULL CHECK(operation IN ('GRANT','CORRECTION')), request_key TEXT NOT NULL,
 request_fingerprint TEXT NOT NULL, reason TEXT CHECK(reason IS NULL OR length(reason)<=500),
 prior_tier TEXT NOT NULL, resulting_tier TEXT NOT NULL, movement_ids TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(owner_teacher_id, request_key), UNIQUE(reward_id, operation)
);
CREATE TABLE gem_advantage_redemptions (
 id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
 assessment_context_id TEXT NOT NULL REFERENCES assessment_contexts(id) ON DELETE RESTRICT,
 academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
 currency TEXT NOT NULL CHECK(currency IN ('EMERALD','RUBY','DIAMOND')), cost INTEGER NOT NULL CHECK(cost IN (1,2)),
 request_key TEXT NOT NULL, request_fingerprint TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('ACTIVE','REVERSED')),
 owner_teacher_id TEXT NOT NULL REFERENCES teacher_accounts(id) ON DELETE RESTRICT, created_at TEXT NOT NULL,
 reversal_operation_id TEXT UNIQUE, reversal_request_key TEXT, reversal_fingerprint TEXT,
 reversal_trigger TEXT CHECK(reversal_trigger IN ('MANUAL','SOURCE_REVOKED')),
 reversal_reason TEXT CHECK(reversal_reason IS NULL OR length(reversal_reason)<=500), reversed_at TEXT,
  UNIQUE(student_id, assessment_context_id, academic_year_id), UNIQUE(owner_teacher_id, request_key),
  UNIQUE(owner_teacher_id, reversal_request_key),
  CHECK((state='ACTIVE' AND reversal_operation_id IS NULL AND reversal_request_key IS NULL AND reversal_fingerprint IS NULL AND reversal_trigger IS NULL AND reversal_reason IS NULL AND reversed_at IS NULL) OR
        (state='REVERSED' AND reversal_operation_id IS NOT NULL AND reversal_fingerprint IS NOT NULL AND reversed_at IS NOT NULL AND
         ((reversal_trigger='MANUAL' AND reversal_request_key IS NOT NULL AND reversal_reason IS NOT NULL) OR
          (reversal_trigger='SOURCE_REVOKED' AND reversal_request_key IS NULL AND reversal_reason IS NULL))))
);
CREATE TABLE gem_spend_allocations (
 id TEXT PRIMARY KEY, redemption_id TEXT NOT NULL REFERENCES gem_advantage_redemptions(id) ON DELETE RESTRICT,
 funding_movement_id TEXT NOT NULL REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 spend_movement_id TEXT NOT NULL UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 spend_reversal_movement_id TEXT UNIQUE REFERENCES gem_ledger(id) ON DELETE RESTRICT,
 created_at TEXT NOT NULL, released_at TEXT,
 release_reason TEXT CHECK(release_reason IS NULL OR release_reason IN ('ADVANTAGE_REVERSED','ENTITLEMENT_REVOKED')),
  UNIQUE(redemption_id, funding_movement_id),
  CHECK((released_at IS NULL AND release_reason IS NULL AND spend_reversal_movement_id IS NULL) OR
        (released_at IS NOT NULL AND release_reason IS NOT NULL AND spend_reversal_movement_id IS NOT NULL))
);
CREATE INDEX idx_gem_ledger_student_year_currency_created ON gem_ledger(student_id, academic_year_id, currency, created_at, id);
CREATE INDEX idx_gem_ledger_source ON gem_ledger(source_kind, source_id);
CREATE INDEX idx_gem_ledger_family ON gem_ledger(source_kind, source_family_id, unit_index, created_at, id);
CREATE INDEX idx_gem_result_rewards_student_year ON gem_result_rewards(student_id, academic_year_id);
CREATE INDEX idx_gem_reconciliation_revisions_correlation ON gem_reconciliation_revisions(transaction_correlation_id);
CREATE INDEX idx_gem_spend_allocations_movement ON gem_spend_allocations(funding_movement_id, released_at);
CREATE UNIQUE INDEX uq_gem_spend_allocations_active_funding ON gem_spend_allocations(funding_movement_id) WHERE released_at IS NULL;
INSERT INTO gem_reward_catalogue (id, currency, cost) VALUES
 ('emerald-assessment-advantage','EMERALD',2), ('ruby-assessment-advantage','RUBY',1), ('diamond-assessment-advantage','DIAMOND',1);
INSERT INTO gem_reconciliation_cursors (stream,last_sequence,updated_at)
 VALUES ('xp-level-grant-transitions',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
