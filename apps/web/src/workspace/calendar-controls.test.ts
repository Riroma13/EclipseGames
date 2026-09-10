import { describe, expect, it } from 'vitest';
import { eligibilityMessages, weekdays } from './CalendarControls';

describe('calendar controls contract', () => {
  it('offers ISO weekday values with unambiguous labels', () => {
    expect(weekdays).toEqual(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
  });

  it('maps every server reason to stable teacher copy', () => {
    expect(Object.keys(eligibilityMessages)).toHaveLength(7);
    expect(eligibilityMessages.USED_SLOT_DATE).toBe('This period has already been used today.');
    expect(eligibilityMessages.ELIGIBLE).toBe('Class can start now.');
  });
});
