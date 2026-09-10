import { localPartsDetailed } from './clock.js';

export const EARLY_START_MINUTES = 15;
export type CalendarReason = 'ACTIVE_SESSION' | 'ARCHIVED_YEAR' | 'UNCONFIGURED' | 'OUTSIDE_TERM' | 'HOLIDAY' | 'NO_CLASS_DAY' | 'OUTSIDE_TIMETABLE' | 'USED_SLOT_DATE' | 'ELIGIBLE';
export type ResolverSlot = { id: string; groupId: string; weekday: number; startsAt: string; endsAt: string };
export type ResolverInput = { now: Date; timezone: string; localDate?: string; yearArchived: boolean; configured: boolean; terms: Array<{ startsOn: string; endsOn: string }>; holidays: Array<{ startsOn: string; endsOn: string }>; slots: ResolverSlot[]; used: Set<string>; active: boolean };
export type ResolvedOccurrence = ResolverSlot & { localDate: string; timing: 'EARLY' | 'SCHEDULED' };
export type Resolution = { reason: CalendarReason; eligible: boolean; startTiming: 'EARLY' | 'SCHEDULED' | null; currentClass: ResolvedOccurrence | null };

const toSeconds = (time: string) => { const [hour, minute] = time.split(':').map(Number); return hour * 3600 + minute * 60; };
const usedKey = (slotId: string, date: string) => `${slotId}:${date}`;
const inRange = (start: string, end: string, date: string) => start <= date && date <= end;

export function resolveCalendar(input: ResolverInput): Resolution {
  const parts = localPartsDetailed(input.now, input.timezone);
  const date = input.localDate ?? parts.date;
  const currentSeconds = toSeconds(parts.time) + parts.seconds;
  const base = (reason: CalendarReason, currentClass: ResolvedOccurrence | null = null): Resolution => ({ reason, eligible: reason === 'ELIGIBLE', startTiming: reason === 'ELIGIBLE' ? currentClass?.timing ?? null : null, currentClass });
  const active = (resolution: Resolution) => input.active ? base('ACTIVE_SESSION', resolution.currentClass) : resolution;
  if (input.yearArchived) return active(base('ARCHIVED_YEAR'));
  if (!input.configured) return active(base('UNCONFIGURED'));
  if (!input.terms.some(term => inRange(term.startsOn, term.endsOn, date))) return active(base('OUTSIDE_TERM'));
  if (input.holidays.some(holiday => inRange(holiday.startsOn, holiday.endsOn, date))) return active(base('HOLIDAY'));
  const slots = input.slots.filter(slot => slot.weekday === parts.weekday);
  const scheduled = slots.filter(slot => toSeconds(slot.startsAt) <= currentSeconds && currentSeconds < toSeconds(slot.endsAt));
  if (scheduled.length > 1) throw new Error('Malformed overlapping timetable slots.');
  if (scheduled[0]) {
    const occurrence = { ...scheduled[0], localDate: date, timing: 'SCHEDULED' as const };
    return active(base(input.used.has(usedKey(occurrence.id, date)) ? 'USED_SLOT_DATE' : 'ELIGIBLE', occurrence));
  }
  const early = slots.filter(slot => toSeconds(slot.startsAt) - EARLY_START_MINUTES * 60 <= currentSeconds && currentSeconds < toSeconds(slot.startsAt))
    .sort((a, b) => toSeconds(a.startsAt) - toSeconds(b.startsAt) || toSeconds(a.endsAt) - toSeconds(b.endsAt) || a.id.localeCompare(b.id));
  if (!early.length) return active(base(slots.length ? 'OUTSIDE_TIMETABLE' : 'NO_CLASS_DAY'));
  const first = early[0];
  const unused = early.find(slot => !input.used.has(usedKey(slot.id, date)));
  const occurrence = { ...(unused ?? first), localDate: date, timing: 'EARLY' as const };
  return active(base(unused ? 'ELIGIBLE' : 'USED_SLOT_DATE', occurrence));
}

export const occurrenceKey = usedKey;
