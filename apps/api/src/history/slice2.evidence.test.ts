import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { historyFamilies } from '@eclipse/contracts';
import { migrateDatabase } from '../db/migrate.js';
import { adapters, composeHistory } from './adapters.js';
import { createServer } from '../server.js';

const teacher = '10000000-0000-4000-8000-000000000001';
const year = '20000000-0000-4000-8000-000000000001';
const group = '30000000-0000-4000-8000-000000000001';
const student = '40000000-0000-4000-8000-000000000001';
const term = '70000000-0000-4000-8000-000000000001';
const credentials = { email: 'slice2-evidence@example.test', password: 'correct horse battery staple' };

function seed(db: Database.Database) {
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher, 't@example.test', 'hash', '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(year, teacher, '2026', '2026-01-01', '2026-12-31', null, '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group, teacher, year, 'Group', '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO students VALUES (?,?,?,?,?,?,?,?,?)').run(student, group, 'Student', 'S', 'default', null, null, null, '2026-01-01T00:00:00.000Z');
  db.prepare('INSERT INTO academic_calendars VALUES (?,?,?,?,?,?)').run('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', year, teacher, 'UTC', '2026-01-01', '2026-01-01');
  db.prepare('INSERT INTO academic_terms VALUES (?,?,?,?,?,?,?)').run(term, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', year, teacher, 'T1', '2026-01-01', '2026-12-31');
}

describe('SPEC-0041 Slice 2 executable evidence', () => {
  let db: Database.Database;
  beforeEach(() => { db = new Database(':memory:'); migrateDatabase(db); seed(db); });

  it('registers exactly one adapter for every approved history family', () => {
    expect(Object.keys(adapters).sort()).toEqual([...historyFamilies].sort());
  });

  it('applies family and inclusive/exclusive date filters to authoritative current timestamps', () => {
    db.prepare('INSERT INTO classroom_events (id,owner_teacher_id,group_id,title,description,status,show_on_projection,theme,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run('80000000-0000-4000-8000-000000000001', teacher, group, 'Event', 'private source content', 'ACTIVE', 0, 'MISSION', '2026-02-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z');
    const context: any = { ownerTeacherId: teacher, groupId: group, academicYearId: year, query: { academicYearId: year, family: 'CLASSROOM_EVENT', from: '2026-03-01T00:00:00.000Z', to: '2026-03-02T00:00:00.000Z', limit: 25 } };
    const rows = composeHistory(db, context);
    expect(rows).toHaveLength(1);
    expect(rows[0].family).toBe('CLASSROOM_EVENT');
    expect(rows[0].occurredAt).toBe('2026-03-01T00:00:00.000Z');
    expect(rows[0].dto.summary).not.toContain('private source content');
  });

  it('keeps archived owned records readable without enabling writes', () => {
    db.prepare('INSERT INTO classroom_events (id,owner_teacher_id,group_id,title,description,status,show_on_projection,theme,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run('80000000-0000-4000-8000-000000000002', teacher, group, 'Archived event', 'source', 'COMPLETED', 0, 'MISSION', '2026-02-01T00:00:00.000Z', '2026-02-02T00:00:00.000Z');
    db.prepare('UPDATE academic_years SET archived_at=? WHERE id=?').run('2026-04-01T00:00:00.000Z', year);
    const before = db.prepare('SELECT title,status FROM classroom_events WHERE id=?').get('80000000-0000-4000-8000-000000000002');
    const rows = adapters.CLASSROOM_EVENT(db, { ownerTeacherId: teacher, groupId: group, academicYearId: year, query: { academicYearId: year, limit: 25 } }, 25);
    expect(rows[0].dto.title).toBe('Archived event');
    expect(db.prepare('SELECT title,status FROM classroom_events WHERE id=?').get('80000000-0000-4000-8000-000000000002')).toEqual(before);
  });

  it('does not perform per-item student lookups while mapping XP history', () => {
    for (const [id, occurredAt] of [
      ['60000000-0000-4000-8000-000000000001', '2026-02-02T00:00:00.000Z'],
      ['60000000-0000-4000-8000-000000000002', '2026-02-03T00:00:00.000Z'],
    ]) {
      db.prepare('INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,comment,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(id, teacher, student, year, 'COMMUNICATION', 1, null, null, 1, 0, 1, 'private comment', occurredAt, teacher, `request-${id}`, `fingerprint-${id}`);
    }
    const originalPrepare = db.prepare.bind(db);
    let studentQueries = 0;
    const prepare = vi.spyOn(db, 'prepare').mockImplementation((sql: string) => {
      if (sql.includes('SELECT id, real_name realName, alias FROM students')) studentQueries++;
      return originalPrepare(sql);
    });
    try {
      adapters.XP(db, { ownerTeacherId: teacher, groupId: group, academicYearId: year, query: { academicYearId: year, limit: 25 } }, 25);
      expect(studentQueries).toBeLessThanOrEqual(1);
    } finally {
      prepare.mockRestore();
    }
  });

  it('proves every approved family reaches the unified closed DTO and deterministic tie order', async () => {
    const app = createServer(':memory:', { bootstrapTeacher: credentials });
    try {
      const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: credentials });
      const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
      const yearResponse = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Evidence year', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
      const yearId = yearResponse.json().id as string;
      const groupResponse = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers, payload: { name: 'Evidence group' } });
      const groupId = groupResponse.json().id as string;
      const calendar = await app.inject({ method: 'PUT', url: `/api/v1/academic-years/${yearId}/calendar`, headers, payload: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: '2026-01-01', endsOn: '2026-04-30' }, { code: 'T2', startsOn: '2026-05-01', endsOn: '2026-08-31' }, { code: 'T3', startsOn: '2026-09-01', endsOn: '2026-12-31' }], holidays: [], slots: [] } });
      expect(calendar.statusCode).toBe(200);

      const originals = { ...adapters };
      const tie = '2026-06-01T00:00:00.000Z';
      const dto = (family: typeof historyFamilies[number], id: string) => ({ id, family, kind: 'EVIDENCE', occurredAt: tie, student: null, termId: null, sessionId: null, title: 'Evidence', summary: 'Evidence', facts: { value: null, amount: null, currency: null, state: null, revision: null }, correction: null });
      for (const family of historyFamilies) {
        (adapters as Record<string, any>)[family] = () => [{ family, sourceId: `ffffffff-ffff-4fff-8fff-${String(historyFamilies.indexOf(family)).padStart(12, '0')}`, itemId: `ffffffff-ffff-4fff-8fff-${String(historyFamilies.indexOf(family)).padStart(12, '0')}`, occurredAt: tie, dto: dto(family, `ffffffff-ffff-4fff-8fff-${String(historyFamilies.indexOf(family)).padStart(12, '0')}`) }];
      }
      (adapters as Record<string, any>).XP = () => [
        { family: 'XP', sourceId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', itemId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', occurredAt: tie, dto: dto('XP', 'ffffffff-ffff-4fff-8fff-ffffffffffff') },
        { family: 'XP', sourceId: '00000000-0000-4000-8000-000000000001', itemId: 'ffffffff-ffff-4fff-8fff-000000000001', occurredAt: tie, dto: dto('XP', 'ffffffff-ffff-4fff-8fff-000000000001') },
      ];
      try {
        const response = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&limit=50`, headers });
        expect(response.statusCode).toBe(200);
        const page = response.json() as { items: Array<{ family: string; id: string; [key: string]: unknown }>; nextCursor: string | null };
        expect(page.items.map(item => item.family)).toEqual([...(historyFamilies.slice(0, 1)), 'XP', 'XP', ...(historyFamilies.slice(2))]);
        expect(page.items.at(1)?.id).toBe('ffffffff-ffff-4fff-8fff-ffffffffffff');
        expect(page.items.at(2)?.id).toBe('ffffffff-ffff-4fff-8fff-000000000001');
        expect(page.nextCursor).toBeNull();
        for (const item of page.items) expect(Object.keys(item).sort()).toEqual(['correction', 'facts', 'family', 'id', 'kind', 'occurredAt', 'sessionId', 'student', 'summary', 'termId', 'title']);
      } finally {
        Object.assign(adapters, originals);
      }
    } finally { await app.close(); }
  });

  it('proves unified endpoint family, student, term, date-range, composed filters, and cursor binding', async () => {
    const app = createServer(':memory:', { bootstrapTeacher: credentials });
    try {
      const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', payload: credentials });
      const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
      const yearResponse = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers, payload: { label: 'Filter year', startsOn: '2026-01-01', endsOn: '2026-12-31' } });
      const yearId = yearResponse.json().id as string;
      const groupResponse = await app.inject({ method: 'POST', url: `/api/v1/academic-years/${yearId}/groups`, headers, payload: { name: 'Filter group' } });
      const groupId = groupResponse.json().id as string;
      const students = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/students`, headers, payload: { students: [{ realName: 'Filter student', alias: 'FS' }] } });
      const studentId = students.json()[0].id as string;
      const weekday = new Date().getUTCDay() || 7;
      const calendar = await app.inject({ method: 'PUT', url: `/api/v1/academic-years/${yearId}/calendar`, headers, payload: { timezone: 'UTC', terms: [{ code: 'T1', startsOn: '2026-01-01', endsOn: '2026-04-30' }, { code: 'T2', startsOn: '2026-05-01', endsOn: '2026-08-31' }, { code: 'T3', startsOn: '2026-09-01', endsOn: '2026-12-31' }], holidays: [], slots: [{ groupId, weekday, startsAt: '00:00', endsAt: '23:59' }] } });
      expect(calendar.statusCode).toBe(200);
      const termId = calendar.json().terms[0].id as string;
      const started = await app.inject({ method: 'POST', url: `/api/v1/groups/${groupId}/real-class-sessions/start`, headers: { ...headers, 'idempotency-key': '00000000-0000-4000-8000-000000000003' }, payload: { academicYearId: yearId } });
      expect(started.statusCode).toBe(201);
      const created = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/xp-evidence`, headers: { ...headers, 'idempotency-key': '50000000-0000-4000-8000-000000000001' }, payload: { category: 'COMMUNICATION', baseXp: 1 } });
      expect(created.statusCode).toBe(201);
      const secondCreated = await app.inject({ method: 'POST', url: `/api/v1/students/${studentId}/xp-evidence`, headers: { ...headers, 'idempotency-key': '50000000-0000-4000-8000-000000000002' }, payload: { category: 'COMMUNICATION', baseXp: 1 } });
      expect(secondCreated.statusCode).toBe(201);
      const broad = 'from=2020-01-01T00:00:00.000Z&to=2030-01-01T00:00:00.000Z';
      expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&family=XP&${broad}`, headers })).json().items.every((item: any) => item.family === 'XP')).toBe(true);
      expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&family=XP&studentId=${studentId}&${broad}`, headers })).json().items.length).toBeGreaterThan(0);
      expect((await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&family=SESSION&termId=${termId}&${broad}`, headers })).json().items.every((item: any) => item.termId === termId)).toBe(true);
      const composed = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&family=XP&studentId=${studentId}&from=2020-01-01T00:00:00.000Z&to=2030-01-01T00:00:00.000Z&limit=1`, headers });
      expect(composed.statusCode).toBe(200);
      if (composed.json().nextCursor) {
        const rebound = await app.inject({ method: 'GET', url: `/api/v1/groups/${groupId}/history?academicYearId=${yearId}&family=RT&studentId=${studentId}&from=2020-01-01T00:00:00.000Z&to=2030-01-01T00:00:00.000Z&limit=1&cursor=${encodeURIComponent(composed.json().nextCursor)}`, headers });
        expect(rebound.statusCode).toBe(422);
      }
    } finally { await app.close(); }
  });
});
