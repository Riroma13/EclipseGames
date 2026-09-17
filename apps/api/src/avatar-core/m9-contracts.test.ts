import { describe, expect, it } from 'vitest';
import { boutiquePurchaseResponseSchema, boutiqueStateSchema } from '@eclipse/contracts';

describe('M9 contract allowlists', () => {
  it('accepts only the public boutique state fields', () => {
    const parsed = boutiqueStateSchema.safeParse({
      studentId: 'student', academicYearId: 'year', catalogueVersion: 'm9-v1', currentTerm: 'T2', emeraldBalance: 4, editable: true,
      items: [{ id: 'hair-braids', category: 'hairId', label: 'Trenzas', cost: 1, minLevel: 2, requiredSpecialtyCategory: null, availableFromTerm: 'T1', owned: true, equipped: false, status: 'AVAILABLE' }],
    });
    expect(parsed.success).toBe(true);
    expect(boutiqueStateSchema.safeParse({ studentId: 'student', academicYearId: 'year', catalogueVersion: 'm9-v1', currentTerm: null, emeraldBalance: 0, editable: true, items: [], purchaseId: 'private' }).success).toBe(false);
  });

  it('keeps purchase responses exact and rejects private evidence', () => {
    const response = boutiquePurchaseResponseSchema.safeParse({ purchaseId: 'purchase', studentId: 'student', academicYearId: 'year', itemId: 'hair-braids', currency: 'EMERALD', cost: 1, emeraldBalance: 3, purchasedAt: '2026-01-01T00:00:00.000Z', replay: false });
    expect(response.success).toBe(true);
    expect(boutiquePurchaseResponseSchema.safeParse({ ...response.data, requestKey: 'secret' }).success).toBe(false);
  });
});
