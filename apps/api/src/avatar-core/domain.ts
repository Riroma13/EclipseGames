import { avatarProfileSchema, type AvatarProfile } from '@eclipse/contracts';
import { specialtyCategory, type Specialty } from '@eclipse/domain';
import { avatarCatalogue, avatarCatalogueIds, availability, boutiqueAvailabilityStatus, type AvatarAvailabilityPort } from './catalogue.js';

export { avatarProfileSchema };
export type { AvatarProfile };


export const legacyAvatarProfile = (avatar: 'default'|'fox'|'owl'|'cat'|'wolf'): AvatarProfile => ({ faceId: avatar === 'default' ? 'face-human' : `face-${avatar}` as AvatarProfile['faceId'], skinToneId: 'skin-medium', hairId: avatar === 'default' ? 'hair-short' : 'hair-none', featureId: 'feature-none', clothingId: 'clothing-eclipse', accessoryId: 'accessory-none', frameId: 'frame-none', backgroundId: 'background-eclipse' });
export function specialtyCategoryFor(specialty: string|null) { return specialty && specialty in specialtyCategory ? specialtyCategory[specialty as Specialty] : null; }
export type AvatarRenderResult = { kind: 'layers'; profile: AvatarProfile } | { kind: 'fallback'; initials: string; invariant: 'INVALID_AVATAR_PROFILE' };
export function renderAvatar(profile: unknown, initials: string): AvatarRenderResult { const parsed = avatarProfileSchema.safeParse(profile); return parsed.success && Object.values(parsed.data).every((id) => avatarCatalogueIds.has(id)) ? { kind: 'layers', profile: parsed.data } : { kind: 'fallback', initials, invariant: 'INVALID_AVATAR_PROFILE' }; }

export { avatarCatalogue, avatarCatalogueIds, availability, boutiqueAvailabilityStatus } from './catalogue.js';
export type { AvatarAvailabilityPort } from './catalogue.js';
