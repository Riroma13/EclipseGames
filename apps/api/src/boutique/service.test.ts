import BetterSqlite3 from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { migrateDatabase } from '../db/migrate.js';
import * as service from './service.js';
import { ApiError } from '../http/errors.js';

const ids = { teacher: randomUUID(), year: randomUUID(), group: randomUUID(), student: randomUUID(), calendar: randomUUID(), term: randomUUID() };
const key = () => randomUUID();

function fixture() {
  const db = new BetterSqlite3(':memory:');
  db.pragma('foreign_keys = ON');
  migrateDatabase(db);
  const now = new Date().toISOString();
  db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(ids.teacher, 'boutique-service@example.test', 'hash', now);
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, 'Boutique service year', '2026-01-01', '2026-12-31', now);
  db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'Boutique service group', now);
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,created_at) VALUES (?,?,?,?,?,?,?)').run(ids.student, ids.group, 'Private', 'Service', 'default', 'Leader', now);
  db.prepare('INSERT INTO academic_calendars (id,academic_year_id,owner_teacher_id,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(ids.calendar, ids.year, ids.teacher, 'UTC', now, now);
  db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run(ids.term, ids.calendar, ids.year, ids.teacher, 'T1', '2026-01-01', '2026-12-31');
  return db;
}

function grant(db: BetterSqlite3.Database, count = 1) {
  for (let unit = 1; unit <= count; unit += 1) db.prepare(`INSERT INTO gem_ledger (id,student_id,academic_year_id,currency,amount,movement_kind,source_kind,source_id,source_family_id,unit_index,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), ids.student, ids.year, 'EMERALD', 1, 'GRANT', 'RESULT_REWARD', `result:operation:${randomUUID()}`, `result:reward:${randomUUID()}`, unit, new Date().toISOString(), ids.teacher);
}

function unlockLevelTwo(db: BetterSqlite3.Database) {
  for (let index = 0; index < 4; index += 1) db.prepare(`INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,real_class_session_id,term_id,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,comment,created_at,created_by_teacher_id,client_request_id,request_fingerprint,gem_receipt_allowed_at_award) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(randomUUID(), ids.teacher, ids.student, ids.year, 'COMMUNICATION', 3, null, null, 'Leader', 'COMMUNICATION', 0, 0, 3, null, new Date().toISOString(), ids.teacher, randomUUID(), randomUUID(), 0);
}

describe('boutique purchase service', () => {
  const dbs: BetterSqlite3.Database[] = [];
  afterEach(() => dbs.splice(0).forEach(db => db.close()));

  it('atomically purchases, replays, and rejects a changed idempotency payload', () => {
    const db = fixture(); dbs.push(db); unlockLevelTwo(db); grant(db);
    const requestKey = key();
    const first = service.buy(db, ids.teacher, ids.student, ids.year, 'hair-braids', null, requestKey);
    expect(first.status).toBe(201); expect(first.value.replay).toBe(false); expect(first.value.emeraldBalance).toBe(0);
    const replay = service.buy(db, ids.teacher, ids.student, ids.year, 'hair-braids', null, requestKey);
    expect(replay).toMatchObject({ status: 200, value: { purchaseId: first.value.purchaseId, replay: true, emeraldBalance: 0 } });
    expect(() => service.buy(db, ids.teacher, ids.student, ids.year, 'feature-eclipse-mark', null, requestKey)).toThrowError(ApiError);
    expect(db.prepare('SELECT COUNT(*) AS count FROM boutique_purchases').get()).toEqual({ count: 1 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM gem_ledger WHERE movement_kind='SPEND'").get()).toEqual({ count: 1 });
  });

  it('does not partially write when Emeralds are insufficient', () => {
    const db = fixture(); dbs.push(db); unlockLevelTwo(db);
    expect(() => service.buy(db, ids.teacher, ids.student, ids.year, 'hair-braids', null, key())).toThrowError(/Insufficient Emeralds/);
    expect(db.prepare('SELECT COUNT(*) AS count FROM boutique_purchases').get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM gem_ledger WHERE movement_kind='SPEND'").get()).toEqual({ count: 0 });
  });

  it('applies the canonical Alert spending restriction without an active session', () => {
    const db = fixture(); dbs.push(db); unlockLevelTwo(db); grant(db);
    db.prepare('INSERT INTO behaviour_student_state (student_id,owner_teacher_id,academic_year_id,group_id,current_lives) VALUES (?,?,?,?,?)').run(ids.student, ids.teacher, ids.year, ids.group, 2);
    expect(() => service.buy(db, ids.teacher, ids.student, ids.year, 'hair-braids', null, key())).toThrowError(/restricted by behaviour policy/);
    expect(db.prepare('SELECT COUNT(*) AS count FROM boutique_purchases').get()).toEqual({ count: 0 });
  });
});
