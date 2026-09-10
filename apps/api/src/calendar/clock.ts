export type Clock = { now(): Date };
export const systemClock: Clock = { now: () => new Date() };

export function localPartsDetailed(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}`, seconds: Number(get('second')), weekday: weekday === 0 ? 7 : weekday };
}
export function localParts(instant: Date, timezone: string) { const { seconds: _seconds, ...parts } = localPartsDetailed(instant, timezone); return parts; }

export function validTimezone(timezone: string) { try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); return true; } catch { return false; } }

/** Converts a local wall time without consulting the host timezone. */
export function wallTimeToZonedInstant(localDate: string, localTime: string, timezone: string): Date | null {
  if (!validTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) return null;
  const wanted = `${localDate}T${localTime}:00`;
  const naive = Date.parse(`${wanted}Z`);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const matches: Date[] = [];
  const seeds = [-36, -24, -12, 0, 12, 24, 36].map(hours => new Date(naive + hours * 3_600_000));
  for (const seed of seeds) {
    const seedParts = formatter.formatToParts(seed);
    const getSeed = (type: string) => seedParts.find(part => part.type === type)?.value ?? '';
    const localEpoch = Date.parse(`${getSeed('year')}-${getSeed('month')}-${getSeed('day')}T${getSeed('hour')}:${getSeed('minute')}:${getSeed('second')}Z`);
    const offset = localEpoch - seed.getTime();
    for (const foldOffset of [0, -3_600_000, 3_600_000]) {
      const candidate = new Date(naive - offset + foldOffset);
    const parts = formatter.formatToParts(candidate);
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    if (`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}` === wanted) matches.push(candidate);
    }
  }
  return matches.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
}
