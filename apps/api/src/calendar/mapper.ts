export const toCalendarDto = (value: any) => value.configured === false ? { configured: false, canReplace: value.canReplace } : ({ configured: true, canReplace: value.canReplace, academicYearId: value.academicYearId, timezone: value.timezone, terms: value.terms, holidays: value.holidays, slots: value.slots });
export const toSessionDto = (value: any) => ({ ...value });
