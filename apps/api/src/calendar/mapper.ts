export const toCalendarDto = (value: any) => value.configured === false ? value : ({ configured: true, academicYearId: value.academicYearId, timezone: value.timezone, terms: value.terms, holidays: value.holidays, slots: value.slots });
export const toSessionDto = (value: any) => ({ ...value });
