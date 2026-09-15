import { avatarProfileSchema, type AvatarProfile, type AvatarCatalogueDto } from '@eclipse/contracts';
import { specialtyCategory, type Specialty } from '@eclipse/domain';

export { avatarProfileSchema };
export type { AvatarProfile };

const item = (id: string, label: string) => ({ id, label });
export const avatarCatalogue: AvatarCatalogueDto = { version: 'm7-v1', categories: [
  { id: 'faceId', label: 'Rostro', items: [item('face-human', 'Humano'), item('face-fox', 'Zorro'), item('face-owl', 'Búho'), item('face-cat', 'Gato'), item('face-wolf', 'Lobo')] },
  { id: 'skinToneId', label: 'Tono de piel', items: [item('skin-light', 'Claro'), item('skin-medium-light', 'Medio claro'), item('skin-medium', 'Medio'), item('skin-medium-dark', 'Medio oscuro'), item('skin-dark', 'Oscuro')] },
  { id: 'hairId', label: 'Cabello', items: [item('hair-none', 'Sin cabello'), item('hair-short', 'Corto'), item('hair-curly', 'Rizado'), item('hair-long', 'Largo')] },
  { id: 'featureId', label: 'Rasgo', items: [item('feature-none', 'Ninguno'), item('feature-glasses', 'Gafas'), item('feature-freckles', 'Pecas')] },
  { id: 'clothingId', label: 'Ropa', items: [item('clothing-eclipse', 'Éclipse'), item('clothing-field', 'Exploración')] },
  { id: 'accessoryId', label: 'Accesorio', items: [item('accessory-none', 'Ninguno'), item('accessory-pin', 'Insignia')] },
  { id: 'frameId', label: 'Marco', items: [item('frame-none', 'Ninguno'), item('frame-orbit', 'Órbita')] },
  { id: 'backgroundId', label: 'Fondo', items: [item('background-eclipse', 'Éclipse'), item('background-night', 'Noche')] },
] };

export const legacyAvatarProfile = (avatar: 'default'|'fox'|'owl'|'cat'|'wolf'): AvatarProfile => ({ faceId: avatar === 'default' ? 'face-human' : `face-${avatar}` as AvatarProfile['faceId'], skinToneId: 'skin-medium', hairId: avatar === 'default' ? 'hair-short' : 'hair-none', featureId: 'feature-none', clothingId: 'clothing-eclipse', accessoryId: 'accessory-none', frameId: 'frame-none', backgroundId: 'background-eclipse' });
export function specialtyCategoryFor(specialty: string|null) { return specialty && specialty in specialtyCategory ? specialtyCategory[specialty as Specialty] : null; }
export type AvatarAvailabilityPort = { allows(studentId: string, itemId: string): boolean | Promise<boolean> };
export const availability: AvatarAvailabilityPort = { allows: (_studentId, itemId) => avatarCatalogue.categories.some((category) => category.items.some((entry) => entry.id === itemId)) };

const allIds = new Set(avatarCatalogue.categories.flatMap((category) => category.items.map((entry) => entry.id)));
export type AvatarRenderResult = { kind: 'layers'; profile: AvatarProfile } | { kind: 'fallback'; initials: string; invariant: 'INVALID_AVATAR_PROFILE' };
export function renderAvatar(profile: unknown, initials: string): AvatarRenderResult { const parsed = avatarProfileSchema.safeParse(profile); return parsed.success && Object.values(parsed.data).every((id) => allIds.has(id)) ? { kind: 'layers', profile: parsed.data } : { kind: 'fallback', initials, invariant: 'INVALID_AVATAR_PROFILE' }; }
