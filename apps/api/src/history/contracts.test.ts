import { describe, expect, it } from 'vitest';
import { historyDtoKeys, historyItemSchema, historyQuerySchema } from './contracts.js';
describe('history foundation contracts', () => {
  it('accepts defaults, normalizes UTC dates, and rejects invalid ranges', () => { const value=historyQuerySchema.parse({academicYearId:'00000000-0000-4000-8000-000000000001',from:'2026-09-01T00:00:00+02:00'}); expect(value.limit).toBe(25); expect(value.from).toBe('2026-08-31T22:00:00.000Z'); expect(()=>historyQuerySchema.parse({academicYearId:value.academicYearId,from:'2026-09-02T00:00:00Z',to:'2026-09-01T00:00:00Z'})).toThrow(); });
  it('keeps the DTO closed to exactly the approved keys', () => { expect(historyItemSchema.safeParse({id:'00000000-0000-4000-8000-000000000001',family:'XP',kind:'GRANT',occurredAt:'2026-09-01T00:00:00.000Z',student:null,termId:null,sessionId:null,title:'x',summary:'x',facts:{value:null,amount:null,currency:null,state:null,revision:null},correction:null,rawRow:'private'}).success).toBe(false); expect(historyDtoKeys).toHaveLength(11); });
});
