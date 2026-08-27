import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const appMetadata = sqliteTable('app_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const teacherAccounts = sqliteTable('teacher_accounts', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

export const academicYears = sqliteTable('academic_years', {
  id: text('id').primaryKey(),
  ownerTeacherId: text('owner_teacher_id').notNull().references(() => teacherAccounts.id),
  label: text('label').notNull(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('uq_academic_years_owner_label').on(table.ownerTeacherId, sql`${table.label} COLLATE NOCASE`),
  index('idx_academic_years_owner_archive_start').on(table.ownerTeacherId, table.archivedAt, table.startsOn),
]);

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  ownerTeacherId: text('owner_teacher_id').notNull().references(() => teacherAccounts.id),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('uq_groups_year_name').on(table.academicYearId, sql`${table.name} COLLATE NOCASE`),
  index('idx_groups_owner_year').on(table.ownerTeacherId, table.academicYearId),
]);

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => groups.id),
  realName: text('real_name').notNull(),
  alias: text('alias').notNull(),
  avatar: text('avatar').notNull(),
  specialty: text('specialty'),
  archivedAt: text('archived_at'),
  groupCorrectionLockedAt: text('group_correction_locked_at'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('uq_students_active_group_alias')
    .on(table.groupId, sql`${table.alias} COLLATE NOCASE`)
    .where(sql`${table.archivedAt} IS NULL`),
  index('idx_students_group_archive_alias_id').on(table.groupId, table.archivedAt, table.alias, table.id),
]);

export const xpEvidenceEvents = sqliteTable('xp_evidence_events', { id: text('id').primaryKey(), ownerTeacherId: text('owner_teacher_id').notNull(), studentId: text('student_id').notNull(), academicYearId: text('academic_year_id').notNull(), category: text('category').notNull(), baseXp: integer('base_xp').notNull(), specialtyAtAward: text('specialty_at_award'), specialtyCategoryAtAward: text('specialty_category_at_award'), bonusEligibleAtAward: integer('bonus_eligible_at_award').notNull(), specialtyBonusXp: integer('specialty_bonus_xp').notNull(), effectiveXp: integer('effective_xp').notNull(), comment: text('comment'), createdAt: text('created_at').notNull(), createdByTeacherId: text('created_by_teacher_id').notNull(), clientRequestId: text('client_request_id').notNull(), requestFingerprint: text('request_fingerprint').notNull() }, (table) => [uniqueIndex('uq_xp_events_owner_request').on(table.ownerTeacherId, table.clientRequestId), index('idx_xp_events_student_year_created').on(table.studentId, table.academicYearId, table.createdAt, table.id), check('ck_xp_events_effective', sql`${table.effectiveXp} = ${table.baseXp} + ${table.specialtyBonusXp}`)]);
export const xpEvidenceReversals = sqliteTable('xp_evidence_reversals', { id: text('id').primaryKey(), ownerTeacherId: text('owner_teacher_id').notNull(), targetEventId: text('target_event_id').notNull(), reason: text('reason'), createdAt: text('created_at').notNull(), createdByTeacherId: text('created_by_teacher_id').notNull(), clientRequestId: text('client_request_id').notNull(), requestFingerprint: text('request_fingerprint').notNull() }, (table) => [uniqueIndex('uq_xp_reversals_target').on(table.targetEventId), uniqueIndex('uq_xp_reversals_owner_request').on(table.ownerTeacherId, table.clientRequestId)]);
export const xpLevelUnlocks = sqliteTable('xp_level_unlocks', { id: text('id').primaryKey(), studentId: text('student_id').notNull(), academicYearId: text('academic_year_id').notNull(), level: integer('level').notNull(), active: integer('active').notNull(), firstCrossedAt: text('first_crossed_at').notNull(), firstSourceEventId: text('first_source_event_id').notNull(), updatedAt: text('updated_at').notNull() }, (table) => [uniqueIndex('uq_xp_unlocks_student_year_level').on(table.studentId, table.academicYearId, table.level)]);
export const xpLevelGrantTransitions = sqliteTable('xp_level_grant_transitions', { id: text('id').primaryKey(), sequence: integer('sequence').notNull(), unlockId: text('unlock_id').notNull(), kind: text('kind').notNull(), sourceEventId: text('source_event_id'), sourceReversalId: text('source_reversal_id'), sourceTransitionId: text('source_transition_id'), occurredAt: text('occurred_at').notNull() }, (table) => [uniqueIndex('uq_xp_grant_transition_sequence').on(table.sequence), uniqueIndex('uq_xp_grant_transition_unlock').on(table.unlockId).where(sql`${table.kind} = 'GRANT'`), uniqueIndex('uq_xp_grant_transition_source').on(table.sourceTransitionId).where(sql`${table.sourceTransitionId} IS NOT NULL`)]);
export const xpBadgeUnlocks = sqliteTable('xp_badge_unlocks', { id: text('id').primaryKey(), studentId: text('student_id').notNull(), academicYearId: text('academic_year_id').notNull(), category: text('category').notNull(), badgeLabel: text('badge_label').notNull(), active: integer('active').notNull(), firstUnlockedAt: text('first_unlocked_at').notNull(), lastActivatedAt: text('last_activated_at').notNull(), lastRevokedAt: text('last_revoked_at'), sourceEventId: text('source_event_id') }, (table) => [uniqueIndex('uq_xp_badges_student_year_category').on(table.studentId, table.academicYearId, table.category)]);

export const coinLedger = sqliteTable('coin_ledger', { id: text('id').primaryKey(), studentId: text('student_id').notNull().references(() => students.id), academicYearId: text('academic_year_id').notNull().references(() => academicYears.id), amount: integer('amount').notNull(), source: text('source').notNull(), correctionOfId: text('correction_of_id'), redemptionId: text('redemption_id'), sourceTransitionId: text('source_transition_id'), createdAt: text('created_at').notNull() });
export const assessmentContexts = sqliteTable('assessment_contexts', { id: text('id').primaryKey(), groupId: text('group_id').notNull().references(() => groups.id), name: text('name').notNull(), archivedAt: text('archived_at'), createdAt: text('created_at').notNull() }, (table) => [uniqueIndex('uq_assessment_contexts_active_group_normalized_name').on(table.groupId, sql`lower(trim(${table.name}))`).where(sql`${table.archivedAt} IS NULL`)]);
export const coinRewards = sqliteTable('coin_rewards', { id: text('id').primaryKey(), name: text('name').notNull(), cost: integer('cost').notNull(), type: text('type').notNull() });
export const advantageRedemptions = sqliteTable('advantage_redemptions', { id: text('id').primaryKey(), studentId: text('student_id').notNull().references(() => students.id), assessmentContextId: text('assessment_context_id').notNull().references(() => assessmentContexts.id), rewardId: text('reward_id').notNull().references(() => coinRewards.id), cost: integer('cost').notNull(), debitLedgerId: text('debit_ledger_id').notNull().references(() => coinLedger.id), reversalLedgerId: text('reversal_ledger_id').references(() => coinLedger.id), createdAt: text('created_at').notNull(), reversedAt: text('reversed_at'), ownerTeacherId: text('owner_teacher_id').notNull().references(() => teacherAccounts.id), clientRequestId: text('client_request_id'), requestFingerprint: text('request_fingerprint') });
export const coinSpendAllocations = sqliteTable('coin_spend_allocations', { id: text('id').primaryKey(), redemptionId: text('redemption_id').notNull().references(() => advantageRedemptions.id), grantLedgerEntryId: text('grant_ledger_entry_id').notNull().references(() => coinLedger.id), releasedAt: text('released_at'), releaseReason: text('release_reason'), createdAt: text('created_at').notNull() });
