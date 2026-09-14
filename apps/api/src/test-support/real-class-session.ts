import type Database from 'better-sqlite3';
import * as calendar from '../calendar/service.js';
import { sessionStartPort } from '../behaviour/service.js';

type SessionFixture = { teacher: string; year: string; group: string; key: string };

export function startFixtureRealClassSession(db: Database.Database, { teacher, year, group, key }: SessionFixture) {
  const row = db.prepare('SELECT starts_on AS startsOn, ends_on AS endsOn FROM academic_years WHERE id=? AND owner_teacher_id=?').get(year, teacher) as { startsOn: string; endsOn: string };
  const start = new Date(`${row.startsOn}T12:00:00Z`);
  const end = new Date(`${row.endsOn}T12:00:00Z`);
  const firstBreak = new Date(start.getTime() + (end.getTime() - start.getTime()) / 3);
  const secondBreak = new Date(start.getTime() + ((end.getTime() - start.getTime()) * 2) / 3);
  const date = row.startsOn;
  const weekday = start.getUTCDay() || 7;
  calendar.replaceCalendar(db, teacher, year, {
    timezone: 'UTC',
    terms: [
      { code: 'T1', startsOn: row.startsOn, endsOn: firstBreak.toISOString().slice(0, 10) },
      { code: 'T2', startsOn: new Date(firstBreak.getTime() + 86_400_000).toISOString().slice(0, 10), endsOn: secondBreak.toISOString().slice(0, 10) },
      { code: 'T3', startsOn: new Date(secondBreak.getTime() + 86_400_000).toISOString().slice(0, 10), endsOn: row.endsOn },
    ],
    holidays: [],
    slots: [{ groupId: group, weekday, startsAt: '00:00', endsAt: '23:59' }],
  });
  return calendar.start(db, teacher, year, group, key, { now: () => new Date(`${date}T12:00:00.000Z`) }, sessionStartPort).session;
}
