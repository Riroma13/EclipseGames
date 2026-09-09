export type Range = { startsOn: string; endsOn: string };
export function contains(range: Range, date: string) { return range.startsOn <= date && date <= range.endsOn; }
export function overlaps(a: Range, b: Range) { return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn; }
export function intervalContains(start: string, end: string, value: string) { return start <= value && value < end; }
export function intervalsOverlap(a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) { return a.startsAt < b.endsAt && b.startsAt < a.endsAt; }
export function validateTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
