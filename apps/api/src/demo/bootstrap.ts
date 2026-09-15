import type Database from 'better-sqlite3';
import * as calendar from '../calendar/service.js';
import { sessionStartPort } from '../behaviour/service.js';

type DemoCalendar = {
  yearId: string;
  groupId: string;
  startsOn: string;
  endsOn: string;
};

const SESSION_KEY = '00000000-0000-4000-8000-000000003801';

/** Establish the fixed demo lesson through the same calendar/behaviour path as the application. */
export function ensureDemoActiveSession(db: Database.Database, ownerTeacherId: string, input: DemoCalendar) {
  const existing = db.prepare(
    'SELECT id FROM real_class_sessions WHERE owner_teacher_id=? AND academic_year_id=? AND group_id=? AND ended_at IS NULL',
  ).get(ownerTeacherId, input.yearId, input.groupId) as { id: string } | undefined;
  if (existing) return existing.id;

  const starts = new Date(`${input.startsOn}T12:00:00.000Z`);
  const end = new Date(`${input.endsOn}T12:00:00.000Z`);
  const firstBreak = new Date(starts.getTime() + (end.getTime() - starts.getTime()) / 3);
  const secondBreak = new Date(starts.getTime() + ((end.getTime() - starts.getTime()) * 2) / 3);
  const date = input.startsOn;
  const weekday = starts.getUTCDay() || 7;

  if (!db.prepare('SELECT 1 FROM academic_calendars WHERE academic_year_id=? AND owner_teacher_id=?').get(input.yearId, ownerTeacherId)) {
    calendar.replaceCalendar(db, ownerTeacherId, input.yearId, {
      timezone: 'UTC',
      terms: [
        { code: 'T1', startsOn: input.startsOn, endsOn: firstBreak.toISOString().slice(0, 10) },
        { code: 'T2', startsOn: new Date(firstBreak.getTime() + 86_400_000).toISOString().slice(0, 10), endsOn: secondBreak.toISOString().slice(0, 10) },
        { code: 'T3', startsOn: new Date(secondBreak.getTime() + 86_400_000).toISOString().slice(0, 10), endsOn: input.endsOn },
      ],
      holidays: [],
      slots: [{ groupId: input.groupId, weekday, startsAt: '00:00', endsAt: '23:59' }],
    });
  }

  return calendar.start(
    db,
    ownerTeacherId,
    input.yearId,
    input.groupId,
    SESSION_KEY,
    { now: () => starts },
    sessionStartPort,
  ).session.id;
}
