import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as calendar from '../calendar/service.js';
import { sessionStartPort } from '../behaviour/service.js';
import * as game from './service.js';

const teacher = '00000000-0000-4000-8000-000000000601';
const year = '00000000-0000-4000-8000-000000000602';
const group = '00000000-0000-4000-8000-000000000603';
const students = ['00000000-0000-4000-8000-000000000611', '00000000-0000-4000-8000-000000000612', '00000000-0000-4000-8000-000000000613', '00000000-0000-4000-8000-000000000614', '00000000-0000-4000-8000-000000000615'];
const databases: Database.Database[] = [];
const calendarInput = {
  timezone: 'UTC',
  terms: [
    { code: 'T1' as const, startsOn: '2026-01-01', endsOn: '2026-04-30' },
    { code: 'T2' as const, startsOn: '2026-05-01', endsOn: '2026-08-31' },
    { code: 'T3' as const, startsOn: '2026-09-01', endsOn: '2027-01-01' },
  ],
  holidays: [],
  slots: [{ groupId: group, weekday: 1, startsAt: '08:00', endsAt: '09:00' }],
};

afterEach(() => databases.splice(0).forEach(db => db.close()));

function setup() {
  const db = new Database(':memory:');
  databases.push(db);
  migrateDatabase(db, migrations);
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher, 'game@example.test', 'hash', 'now');
  db.prepare('INSERT INTO academic_years VALUES (?,?,?,?,?,?,?)').run(year, teacher, 'Game', '2026-01-01', '2027-01-01', null, 'now');
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group, teacher, year, 'Game group', 'now');
  for (const [index, student] of students.entries()) db.prepare('INSERT INTO students VALUES (?,?,?,?,?,?,?,?,?)').run(student, group, `Student ${index}`, `student-${index}`, 'default', null, null, null, 'now');
  calendar.replaceCalendar(db, teacher, year, calendarInput);
  return db;
}

function activeBehaviourSession(db: Database.Database, lives: number[]) {
  const started = calendar.start(db, teacher, year, group, '00000000-0000-4000-8000-000000000604', { now: () => new Date('2026-09-07T08:30:00.000Z') }, sessionStartPort).session;
  students.forEach((student, index) => db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=? WHERE session_id=? AND student_id=?').run(lives[index], started.id, student));
  return started.id;
}

describe('special activity participant snapshots', () => {
  it('keeps the current roster without a session and excludes only RED_CODE lineage', () => {
    const db = setup();
    expect(game.launchRandomDraw(db, teacher, group, undefined).drawTotal).toBe(5);
    db.prepare('DELETE FROM minigame_sessions').run();
    activeBehaviourSession(db, [4, 3, 2, 1, 0]);
    const launched = game.launchRandomDraw(db, teacher, group, undefined);
    expect(launched.drawTotal).toBe(3);
    const row = db.prepare('SELECT draw_order FROM minigame_sessions WHERE id=?').get(launched.id) as { draw_order: string };
    expect(JSON.parse(row.draw_order)).toHaveLength(3);
  });

  it('does not mutate a team launch when eligible participants cannot fill configured teams', () => {
    const db = setup();
    activeBehaviourSession(db, [1, 0, 4, 4, 4]);
    expect(() => game.launchTeamDraw(db, teacher, group, { teamCount: 4 })).toThrow(/active student count/);
    expect(db.prepare('SELECT count(*) AS count FROM minigame_sessions').get()).toEqual({ count: 0 });
  });

  it.each(['launchRandomDraw', 'drawStudent', 'resetRandomDraw', 'launchTeamDraw', 'shuffleTeamDraw', 'resetTeamDraw'] as const)('%s uses only lives 2 through 4 and excludes RED_CODE', operation => {
    const db = setup();
    activeBehaviourSession(db, [4, 3, 2, 1, 0]);
    const random = game.launchRandomDraw(db, teacher, group, undefined);
    let minigameId = random.id;
    if (operation === 'launchTeamDraw') {
      const team = game.launchTeamDraw(db, teacher, group, { teamCount: 3 });
      minigameId = team.id;
    } else if (operation === 'shuffleTeamDraw' || operation === 'resetTeamDraw') {
      minigameId = game.launchTeamDraw(db, teacher, group, { teamCount: 3 }).id;
    }

    if (operation === 'launchRandomDraw') expect(random.drawTotal).toBe(3);
    if (operation === 'drawStudent') expect(game.drawStudent(db, teacher, minigameId).selectedStudent).not.toBeNull();
    if (operation === 'resetRandomDraw') expect(game.resetMinigame(db, teacher, minigameId).drawTotal).toBe(3);
    if (operation === 'launchTeamDraw') expect(game.currentMinigame(db, teacher, group)?.teamCount).toBe(3);
    if (operation === 'shuffleTeamDraw') expect(game.shuffleTeamDraw(db, teacher, minigameId).teams).toHaveLength(3);
    if (operation === 'resetTeamDraw') expect(game.resetMinigame(db, teacher, minigameId).teams).toHaveLength(3);
  });

  it.each(['launchRandomDraw', 'drawStudent', 'resetRandomDraw', 'launchTeamDraw', 'shuffleTeamDraw', 'resetTeamDraw'] as const)('%s rejects an empty eligible roster atomically', operation => {
    const db = setup();
    activeBehaviourSession(db, [1, 1, 1, 1, 1]);
    let minigameId = '';
    if (operation === 'drawStudent' || operation === 'resetRandomDraw') {
      db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=4').run();
      minigameId = game.launchRandomDraw(db, teacher, group, undefined).id;
      db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=1').run();
    } else if (operation === 'shuffleTeamDraw' || operation === 'resetTeamDraw') {
      db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=4').run();
      minigameId = game.launchTeamDraw(db, teacher, group, { teamCount: 3 }).id;
      db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=1').run();
    }
    expect(() => {
      if (operation === 'launchRandomDraw') game.launchRandomDraw(db, teacher, group, undefined);
      if (operation === 'launchTeamDraw') game.launchTeamDraw(db, teacher, group, { teamCount: 3 });
      if (operation === 'drawStudent') game.drawStudent(db, teacher, minigameId);
      if (operation === 'resetRandomDraw' || operation === 'resetTeamDraw') game.resetMinigame(db, teacher, minigameId);
      if (operation === 'shuffleTeamDraw') game.shuffleTeamDraw(db, teacher, minigameId);
    }).toThrow(expect.objectContaining({ code: 'BEHAVIOUR_RESTRICTED', statusCode: 409 }));
    if (operation.startsWith('launch')) {
      expect(db.prepare('SELECT count(*) AS count FROM minigame_sessions').get()).toEqual({ count: 0 });
    } else {
      expect(db.prepare('SELECT id, status, draw_order, draw_index, team_assignments FROM minigame_sessions WHERE id=?').get(minigameId)).toEqual(
        expect.objectContaining({ status: 'READY', draw_index: 0 }),
      );
    }
  });

  it('keeps the non-archived roster unchanged when no behaviour session matches', () => {
    const db = setup();
    const before = db.prepare('SELECT id, archived_at AS archivedAt FROM students ORDER BY id').all();
    const random = game.launchRandomDraw(db, teacher, group, undefined);
    game.drawStudent(db, teacher, random.id);
    game.resetMinigame(db, teacher, random.id);
    const team = game.launchTeamDraw(db, teacher, group, { teamCount: 2 });
    game.shuffleTeamDraw(db, teacher, team.id);
    game.resetMinigame(db, teacher, team.id);
    expect(db.prepare('SELECT id, archived_at AS archivedAt FROM students ORDER BY id').all()).toEqual(before);
  });

  it('resnapshots current eligibility without rewriting a historical draw snapshot or side-effect ledgers', () => {
    const db = setup();
    activeBehaviourSession(db, [4, 4, 4, 4, 4]);
    const launched = game.launchRandomDraw(db, teacher, group, undefined);
    const historicalOrder = db.prepare('SELECT draw_order AS drawOrder FROM minigame_sessions WHERE id=?').get(launched.id) as { drawOrder: string };
    db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=1 WHERE student_id IN (?,?)').run(students[0], students[1]);
    const sideEffects = db.prepare(`SELECT
      (SELECT count(*) FROM xp_evidence_events) AS xp,
      (SELECT count(*) FROM rt_streak_emerald_entitlements) AS rt,
      (SELECT count(*) FROM gem_ledger) AS ledger,
      (SELECT count(*) FROM gem_spend_allocations) AS allocations,
      (SELECT count(*) FROM coin_ledger) AS coins,
      (SELECT COALESCE(json_group_array(coin_balance), '[]') FROM projection_students WHERE owner_teacher_id=? AND group_id=?) AS balances`).get(teacher, group);
    const selected = game.drawStudent(db, teacher, launched.id);
    const current = db.prepare('SELECT draw_order AS drawOrder FROM minigame_sessions WHERE id=?').get(launched.id) as { drawOrder: string };
    expect(JSON.parse(historicalOrder.drawOrder)).toHaveLength(5);
    expect(JSON.parse(current.drawOrder)).toHaveLength(3);
    expect([students[0], students[1]]).not.toContain(selected.selectedStudent?.id);
    expect(db.prepare(`SELECT
      (SELECT count(*) FROM xp_evidence_events) AS xp,
      (SELECT count(*) FROM rt_streak_emerald_entitlements) AS rt,
      (SELECT count(*) FROM gem_ledger) AS ledger,
      (SELECT count(*) FROM gem_spend_allocations) AS allocations,
      (SELECT count(*) FROM coin_ledger) AS coins,
      (SELECT COALESCE(json_group_array(coin_balance), '[]') FROM projection_students WHERE owner_teacher_id=? AND group_id=?) AS balances`).get(teacher, group)).toEqual(sideEffects);
  });

  it('keeps historical team assignments stable until an explicit resnapshot', () => {
    const db = setup();
    activeBehaviourSession(db, [4, 4, 4, 4, 4]);
    const team = game.launchTeamDraw(db, teacher, group, { teamCount: 2 });
    const before = db.prepare('SELECT team_assignments AS assignments FROM minigame_sessions WHERE id=?').get(team.id) as { assignments: string };
    db.prepare('UPDATE real_class_session_behaviour_roster SET lives_at_start=1 WHERE student_id=?').run(students[0]);
    expect(db.prepare('SELECT team_assignments AS assignments FROM minigame_sessions WHERE id=?').get(team.id)).toEqual(before);
    game.shuffleTeamDraw(db, teacher, team.id);
    const after = db.prepare('SELECT team_assignments AS assignments FROM minigame_sessions WHERE id=?').get(team.id) as { assignments: string };
    expect(Object.keys(JSON.parse(after.assignments))).toHaveLength(4);
    expect(JSON.parse(after.assignments)).not.toHaveProperty(students[0]);
  });
});
