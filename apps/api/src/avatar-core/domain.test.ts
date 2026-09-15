import { describe, expect, it } from 'vitest';
import { avatarProfileSchema, avatarCatalogue, legacyAvatarProfile, specialtyCategoryFor, availability, renderAvatar } from './domain.js';
import { deriveAvatarXp, toRestrictedAvatarDto, toTeacherAvatarDto } from './contracts.js';

describe('M7 avatar domain contracts', () => {
  it('exposes exact ordered catalogue and rejects cross-category or extra fields', () => {
    expect(avatarCatalogue.categories.map((category) => category.items.map((item) => item.id))).toEqual([
      ['face-human', 'face-fox', 'face-owl', 'face-cat', 'face-wolf'], ['skin-light', 'skin-medium-light', 'skin-medium', 'skin-medium-dark', 'skin-dark'],
      ['hair-none', 'hair-short', 'hair-curly', 'hair-long'], ['feature-none', 'feature-glasses', 'feature-freckles'], ['clothing-eclipse', 'clothing-field'], ['accessory-none', 'accessory-pin'], ['frame-none', 'frame-orbit'], ['background-eclipse', 'background-night'],
    ]);
    expect(avatarProfileSchema.safeParse({ ...legacyAvatarProfile('default'), faceId: 'skin-medium' }).success).toBe(false);
    expect(avatarProfileSchema.safeParse({ ...legacyAvatarProfile('default'), extra: 'nope' }).success).toBe(false);
  });

  it('maps all legacy tokens and derives specialty without XP coupling', async () => {
    expect(legacyAvatarProfile('default')).toMatchObject({ faceId: 'face-human', hairId: 'hair-short' });
    expect(['fox', 'owl', 'cat', 'wolf'].map((token) => legacyAvatarProfile(token as 'fox')).map((profile) => profile.faceId)).toEqual(['face-fox', 'face-owl', 'face-cat', 'face-wolf']);
    expect(specialtyCategoryFor('Leader')).toBe('COMMUNICATION'); expect(specialtyCategoryFor('Ally')).toBe('COLLABORATION'); expect(specialtyCategoryFor(null)).toBeNull();
    expect(await availability.allows('student', 'face-human')).toBe(true); expect(await availability.allows('student', 'not-catalogued')).toBe(false);
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
