import Database from 'better-sqlite3';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import * as service from './service.js';

const teacher = '11111111-1111-4111-8111-111111111111';
const year = '22222222-2222-4222-8222-222222222222';
const group = '33333333-3333-4333-8333-333333333333';
const fixed = { now: () => new Date('2026-09-07T06:30:00.000Z') };
const input = { timezone: 'Europe/Paris', terms: [{ code: 'T1' as const, startsOn: '2026-09-01', endsOn: '2026-12-20' }, { code: 'T2' as const, startsOn: '2026-12-21', endsOn: '2027-03-31' }, { code: 'T3' as const, startsOn: '2027-04-01', endsOn: '2027-07-01' }], holidays: [], slots: [{ groupId: group, weekday: 1, startsAt: '08:00', endsAt: '09:00' }] };

function setup() {
  const db = new Database(':memory:'); migrateDatabase(db);
  db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(teacher, 'teacher@example.test', 'hash', new Date().toISOString());
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,archived_at,created_at) VALUES (?,?,?,?,?,?,?)').run(year, teacher, '2026–2027', '2026-09-01', '2027-07-01', null, new Date().toISOString());
  db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(group, teacher, year, 'A', new Date().toISOString());
  return db;
}

describe('calendar persistence and session lifecycle', () => {
  let db: Database.Database;
  beforeEach(() => { db = setup(); }); afterEach(() => db.close());

  it('creates an atomic calendar, reports configured independently of eligibility, and replays start/end', () => {
    service.replaceCalendar(db, teacher, year, input);
    expect(service.status(db, teacher, year, group, { now: () => new Date('2026-09-07T07:30:00.000Z') }).configured).toBe(true);
    const started = service.start(db, teacher, year, group, '11111111-1111-4111-8111-111111111112', fixed);
    expect(started.status).toBe(201); expect(started.session.createdAt).toEqual(expect.any(String));
    const replay = service.start(db, teacher, year, group, '11111111-1111-4111-8111-111111111112', fixed);
    expect(replay.status).toBe(200); expect(replay.session.id).toBe(started.session.id);
    const ended = service.end(db, teacher, started.session.id, '11111111-1111-4111-8111-111111111113', fixed);
    expect(ended.status).toBe(201); expect(ended.session.endedAt).toBe(fixed.now().toISOString());
    expect(service.end(db, teacher, started.session.id, '11111111-1111-4111-8111-111111111113', fixed).status).toBe(200);
    expect(service.status(db, teacher, year, group, fixed).eligible).toBe(false);
    expect(db.prepare('SELECT created_at FROM real_class_sessions WHERE id=?').get(started.session.id)).toBeTruthy();
  });

  it('rejects changed and cross-operation idempotency keys without partial writes', () => {
    service.replaceCalendar(db, teacher, year, input);
    const key = '11111111-1111-4111-8111-111111111114';
    const started = service.start(db, teacher, year, group, key, fixed);
    expect(() => service.start(db, teacher, year, group, key, { now: () => new Date('2026-09-07T06:31:00Z') })).not.toThrow();
    expect(() => service.end(db, teacher, started.session.id, key, fixed)).toThrowError(/another request/);
    expect(() => service.replaceCalendar(db, teacher, year, { ...input, timezone: 'not/a-zone' })).toThrowError(/valid IANA/);
    expect(db.prepare('SELECT COUNT(*) AS count FROM academic_terms').get()).toEqual({ count: 3 });
  });

  it('requires all three terms, owned group access, and UUID-v4 keys for both lifecycle operations', () => {
    expect(() => service.replaceCalendar(db, teacher, year, { ...input, terms: input.terms.slice(0, 1) })).toThrowError(/exactly T1, T2, and T3/);
    const calendar = {
      ...input,
      terms: [
        { code: 'T1' as const, startsOn: '2026-09-01', endsOn: '2026-10-31' },
        { code: 'T2' as const, startsOn: '2026-11-01', endsOn: '2027-02-28' },
        { code: 'T3' as const, startsOn: '2027-03-01', endsOn: '2027-07-01' },
      ],
    };
    service.replaceCalendar(db, teacher, year, calendar);
    expect(() => service.status(db, teacher, year, '33333333-3333-4333-8333-333333333334', fixed)).toThrowError(/Group not found/);
    expect(() => service.start(db, teacher, year, '33333333-3333-4333-8333-333333333334', '11111111-1111-4111-8111-111111111115', fixed)).toThrowError(/Group not found/);
    const started = service.start(db, teacher, year, group, '11111111-1111-4111-8111-111111111116', fixed);
    expect(service.getOwnedRealClassSessionContext(db, teacher, started.session.id)).toMatchObject({ id: started.session.id, groupId: group });
    expect(() => service.end(db, teacher, started.session.id, 'not-a-uuid', fixed)).toThrowError(/UUID-v4/);
  });

  it('enforces composite lineage and restricts calendar deletion while children exist', () => {
    service.replaceCalendar(db, teacher, year, input);
    const calendar = db.prepare('SELECT id FROM academic_calendars').get() as { id: string };
    expect(() => db.prepare('INSERT INTO academic_terms (id,calendar_id,academic_year_id,owner_teacher_id,code,starts_on,ends_on) VALUES (?,?,?,?,?,?,?)').run('44444444-4444-4444-8444-444444444444', calendar.id, year, '99999999-9999-4999-8999-999999999999', 'T2', '2026-01-01', '2026-01-02')).toThrow();
    expect(() => db.prepare('DELETE FROM academic_calendars WHERE id=?').run(calendar.id)).toThrow();
  });

  it('returns stable eligibility reasons in the documented precedence order', () => {
    expect(service.status(db, teacher, year, group, fixed)).toMatchObject({ reason: 'UNCONFIGURED', eligible: false });
    service.replaceCalendar(db, teacher, year, input);
    expect(service.status(db, teacher, year, group, { now: () => new Date('2026-09-07T05:30:00Z') })).toMatchObject({ reason: 'OUTSIDE_TIMETABLE', eligible: false });
    expect(service.status(db, teacher, year, group, { now: () => new Date('2026-09-07T06:30:00Z') })).toMatchObject({ reason: 'ELIGIBLE', eligible: true });
    const started = service.start(db, teacher, year, group, '11111111-1111-4111-8111-111111111117', fixed).session;
    expect(service.status(db, teacher, year, group, fixed)).toMatchObject({ reason: 'ACTIVE_SESSION', eligible: false });
    service.end(db, teacher, started.id, '11111111-1111-4111-8111-111111111118', fixed);
    expect(service.status(db, teacher, year, group, fixed)).toMatchObject({ reason: 'USED_SLOT_DATE', eligible: false });
  });
});
