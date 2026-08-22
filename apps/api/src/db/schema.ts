import { sql } from 'drizzle-orm';
import { index, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
