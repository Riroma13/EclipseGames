import { describe, expect, it } from 'vitest';
import { eligibilityMessages, weekdays } from './CalendarControls';

describe('calendar controls contract', () => {
  it('offers ISO weekday values with unambiguous labels', () => {
    expect(weekdays).toEqual(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
  });

  it('maps every server reason to stable teacher copy', () => {
    expect(Object.keys(eligibilityMessages)).toHaveLength(9);
    expect(eligibilityMessages.ARCHIVED_YEAR).toBe('Este curso académico está archivado. No se pueden comenzar clases.');
    expect(eligibilityMessages.ELIGIBLE).toBe('Puedes comenzarla ahora.');
  });
});
