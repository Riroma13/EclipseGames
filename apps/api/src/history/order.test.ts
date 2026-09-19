import { describe, expect, it } from 'vitest';
import { compareHistoryOrder, type HistoryOrderTuple } from './order.js';
const base={occurredAt:'2026-09-01T00:00:00.000Z',family:'XP' as const,sourceId:'a',itemId:'a'};
describe('history ordering',()=>it('uses family and descending source tie breakers',()=>{ expect(([base,{...base,family:'SESSION'}] satisfies HistoryOrderTuple[]).sort(compareHistoryOrder)[0].family).toBe('SESSION'); expect(([{...base,sourceId:'a'},{...base,sourceId:'b'}] satisfies HistoryOrderTuple[]).sort(compareHistoryOrder)[0].sourceId).toBe('b'); }));
