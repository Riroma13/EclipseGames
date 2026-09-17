import { describe, expect, it } from 'vitest';
import { avatarProfileSchema, avatarCatalogue, legacyAvatarProfile, specialtyCategoryFor, availability, renderAvatar, boutiqueAvailabilityStatus } from './domain.js';
import { deriveAvatarXp, toRestrictedAvatarDto, toTeacherAvatarDto } from './contracts.js';

describe('M9 avatar catalogue and availability contracts', () => {
  it('exposes exact ordered catalogue and rejects cross-category or extra fields', () => {
    expect(avatarCatalogue.version).toBe('m9-v1');
    expect(avatarCatalogue.categories.map((category) => category.items.map((item) => item.id))).toEqual([
      ['face-human', 'face-fox', 'face-owl', 'face-cat', 'face-wolf'], ['skin-light', 'skin-medium-light', 'skin-medium', 'skin-medium-dark', 'skin-dark'],
      ['hair-none', 'hair-short', 'hair-curly', 'hair-long', 'hair-braids'], ['feature-none', 'feature-glasses', 'feature-freckles', 'feature-eclipse-mark'], ['clothing-eclipse', 'clothing-field', 'clothing-orbit'], ['accessory-none', 'accessory-pin', 'accessory-comet', 'accessory-signal', 'accessory-compass', 'accessory-anchor', 'accessory-alliance'], ['frame-none', 'frame-orbit', 'frame-emerald'], ['background-eclipse', 'background-night', 'background-dawn'],
    ]);
    const boutiqueItems = avatarCatalogue.categories.flatMap((category) => category.items).filter((item) => item.access.kind === 'BOUTIQUE');
    expect(boutiqueItems).toHaveLength(10);
    expect(boutiqueItems.find((item) => item.id === 'hair-braids')).toMatchObject({ label: 'Trenzas', order: 1, access: { currency: 'EMERALD', cost: 1, minLevel: 2, availableFromTerm: 'T1' } });
    expect(boutiqueItems.find((item) => item.id === 'clothing-orbit')).toMatchObject({ label: 'Traje orbital', order: 2, access: { currency: 'EMERALD', cost: 2, minLevel: 4, availableFromTerm: 'T2' } });
    expect(boutiqueItems.find((item) => item.id === 'background-dawn')).toMatchObject({ label: 'Amanecer', order: 3, access: { currency: 'EMERALD', cost: 3, minLevel: 6, availableFromTerm: 'T3' } });
    expect(avatarProfileSchema.safeParse({ ...legacyAvatarProfile('default'), faceId: 'skin-medium' }).success).toBe(false);
    expect(avatarProfileSchema.safeParse({ ...legacyAvatarProfile('default'), extra: 'nope' }).success).toBe(false);
  });

  it('maps all legacy tokens and derives specialty without XP coupling', async () => {
    expect(legacyAvatarProfile('default')).toMatchObject({ faceId: 'face-human', hairId: 'hair-short' });
    expect(['fox', 'owl', 'cat', 'wolf'].map((token) => legacyAvatarProfile(token as 'fox')).map((profile) => profile.faceId)).toEqual(['face-fox', 'face-owl', 'face-cat', 'face-wolf']);
    expect(specialtyCategoryFor('Leader')).toBe('COMMUNICATION'); expect(specialtyCategoryFor('Ally')).toBe('COLLABORATION'); expect(specialtyCategoryFor(null)).toBeNull();
    expect(await availability.allows({ studentId: 'student', academicYearId: 'year', itemId: 'face-human', currentTerm: 'T1', level: 1, specialtyCategory: null, owned: false })).toBe(true);
    expect(await availability.allows({ studentId: 'student', academicYearId: 'year', itemId: 'hair-braids', currentTerm: 'T1', level: 2, specialtyCategory: null, owned: true })).toBe(true);
    expect(await availability.allows({ studentId: 'student', academicYearId: 'year', itemId: 'hair-braids', currentTerm: 'T1', level: 2, specialtyCategory: null, owned: false })).toBe(false);
  });

  it('uses cumulative term, level, specialty, and ownership statuses', () => {
    const item = 'accessory-signal';
    expect(boutiqueAvailabilityStatus({ itemId: item, currentTerm: 'T1', level: 3, specialtyCategory: 'COMMUNICATION', owned: true })).toBe('LOCKED_TERM');
    expect(boutiqueAvailabilityStatus({ itemId: item, currentTerm: 'T2', level: 2, specialtyCategory: 'COMMUNICATION', owned: true })).toBe('LOCKED_LEVEL');
    expect(boutiqueAvailabilityStatus({ itemId: item, currentTerm: 'T2', level: 3, specialtyCategory: 'PRECISION', owned: true })).toBe('LOCKED_SPECIALTY');
    expect(boutiqueAvailabilityStatus({ itemId: item, currentTerm: 'T2', level: 3, specialtyCategory: 'COMMUNICATION', owned: false })).toBe('AVAILABLE');
    expect(boutiqueAvailabilityStatus({ itemId: item, currentTerm: null, level: 3, specialtyCategory: 'COMMUNICATION', owned: true })).toBe('LOCKED_TERM');
  });

  it('returns a deterministic neutral initials fallback for invalid renderer input', () => {
    expect(renderAvatar({ ...legacyAvatarProfile('default'), faceId: 'face-unknown' }, 'AB')).toEqual({ kind: 'fallback', initials: 'AB', invariant: 'INVALID_AVATAR_PROFILE' });
    expect(renderAvatar(legacyAvatarProfile('fox'), 'AB')).toEqual({ kind: 'layers', profile: legacyAvatarProfile('fox') });
  });

  it('keeps L8 permanent and restricted mapping free of teacher-only fields', () => {
    const xp = deriveAvatarXp(200, []);
    expect(xp).toMatchObject({ annualEffectiveXp: 200, level: 8, progress: { isMaxLevel: true, progressPercent: 100, nextLevel: null, xpToNextLevel: null } });
    const teacher = toTeacherAvatarDto({ studentId: 's', alias: 'A', specialty: 'Leader', academicYearId: 'y', revision: 2, profile: legacyAvatarProfile('default'), updatedAt: 'now', editable: true }, xp);
    expect(toRestrictedAvatarDto(teacher)).toEqual({ studentId: 's', alias: 'A', specialty: 'Leader', specialtyCategory: 'COMMUNICATION', level: 8, progress: xp.progress, badges: [], profile: teacher.profile });
    expect(toRestrictedAvatarDto(teacher)).not.toHaveProperty('annualEffectiveXp');
    expect(toRestrictedAvatarDto(teacher)).not.toHaveProperty('realName');
  });
});
