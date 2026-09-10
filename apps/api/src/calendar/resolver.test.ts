import { describe, expect, it } from 'vitest';
import { resolveCalendar } from './resolver.js';

const base = { timezone:'Europe/Paris', yearArchived:false, configured:true, terms:[{startsOn:'2026-09-01',endsOn:'2027-07-01'}], holidays:[], slots:[{id:'a',groupId:'g',weekday:1,startsAt:'08:00',endsAt:'09:00'}], used:new Set<string>(), active:false };
const at = (iso:string) => resolveCalendar({ ...base, now:new Date(iso) });

describe('calendar preparation resolver', () => {
  it('uses exact half-open scheduled and early boundaries', () => {
    expect(at('2026-09-07T05:44:00Z').reason).toBe('OUTSIDE_TIMETABLE');
    expect(at('2026-09-07T05:44:59Z').reason).toBe('OUTSIDE_TIMETABLE');
    expect(at('2026-09-07T05:45:00Z')).toMatchObject({ reason:'ELIGIBLE', startTiming:'EARLY' });
    expect(at('2026-09-07T06:00:00Z')).toMatchObject({ reason:'ELIGIBLE', startTiming:'SCHEDULED' });
    expect(at('2026-09-07T07:00:00Z').reason).toBe('OUTSIDE_TIMETABLE');
  });
  it('prioritizes an in-progress slot over an overlapping early window and refuses used current periods', () => {
    const value = { ...base, slots:[{id:'a',groupId:'g',weekday:1,startsAt:'08:00',endsAt:'09:00'},{id:'b',groupId:'g',weekday:1,startsAt:'09:10',endsAt:'10:00'}] };
    expect(resolveCalendar({ ...value, now:new Date('2026-09-07T06:55:00Z') })).toMatchObject({ reason:'ELIGIBLE', startTiming:'SCHEDULED', currentClass:{id:'a'} });
    expect(resolveCalendar({ ...base, used:new Set(['a:2026-09-07']), now:new Date('2026-09-07T06:30:00Z') }).reason).toBe('USED_SLOT_DATE');
  });

  it('keeps adjacent slots deterministic at their shared boundary', () => {
    const value = { ...base, slots:[{id:'a',groupId:'g',weekday:1,startsAt:'08:00',endsAt:'09:00'},{id:'b',groupId:'g',weekday:1,startsAt:'09:00',endsAt:'10:00'}] };
    expect(resolveCalendar({ ...value, now:new Date('2026-09-07T06:59:59Z') }).currentClass?.id).toBe('a');
    expect(resolveCalendar({ ...value, now:new Date('2026-09-07T07:00:00Z') })).toMatchObject({ currentClass:{id:'b'}, startTiming:'SCHEDULED' });
  });
  it('keeps the deterministic first early occurrence when all candidates are used', () => {
    const value = { ...base, slots:[{id:'b',groupId:'g',weekday:1,startsAt:'08:10',endsAt:'09:00'},{id:'a',groupId:'g',weekday:1,startsAt:'08:10',endsAt:'08:30'}], used:new Set(['a:2026-09-07','b:2026-09-07']) };
    expect(resolveCalendar({ ...value, now:new Date('2026-09-07T05:55:00Z') }).currentClass?.id).toBe('a');
  });
  it('gives active sessions priority and rejects archived years', () => {
    expect(resolveCalendar({ ...base, active:true, now:new Date('2026-09-07T06:00:00Z') })).toMatchObject({ reason:'ACTIVE_SESSION', eligible:false, startTiming:null, currentClass:{ id:'a' } });
    expect(resolveCalendar({ ...base, yearArchived:true, now:new Date('2026-09-07T06:00:00Z') }).reason).toBe('ARCHIVED_YEAR');
  });

  it('reports term, holiday, and no-class-day states before timetable eligibility', () => {
    expect(resolveCalendar({ ...base, now:new Date('2026-08-31T06:00:00Z') }).reason).toBe('OUTSIDE_TERM');
    expect(resolveCalendar({ ...base, holidays:[{startsOn:'2026-09-07',endsOn:'2026-09-07'}], now:new Date('2026-09-07T06:00:00Z') }).reason).toBe('HOLIDAY');
    expect(resolveCalendar({ ...base, now:new Date('2026-09-08T06:00:00Z') }).reason).toBe('NO_CLASS_DAY');
  });
});
