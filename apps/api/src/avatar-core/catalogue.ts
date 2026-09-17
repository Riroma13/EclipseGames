import type { AvatarCatalogueDto, AvatarCatalogueItem, AvatarProfile, BoutiqueAvailabilityStatus, XpCategory } from '@eclipse/contracts';

type BoutiqueMeta = { kind: 'BOUTIQUE'; currency: 'EMERALD'; cost: 1|2|3; minLevel: number; requiredSpecialtyCategory: XpCategory|null; availableFromTerm: 'T1'|'T2'|'T3' };
const base = (id: string, label: string, order: number): AvatarCatalogueItem => ({ id, label, order, access: { kind: 'BASE' } });
const boutique = (id: string, label: string, order: number, cost: 1|2|3, minLevel: number, availableFromTerm: 'T1'|'T2'|'T3', requiredSpecialtyCategory: XpCategory|null = null): AvatarCatalogueItem => ({ id, label, order, access: { kind: 'BOUTIQUE', currency: 'EMERALD', cost, minLevel, requiredSpecialtyCategory, availableFromTerm } satisfies BoutiqueMeta });

export const avatarCatalogue: AvatarCatalogueDto = { version: 'm9-v1', categories: [
  { id: 'faceId', label: 'Rostro', items: ['face-human', 'face-fox', 'face-owl', 'face-cat', 'face-wolf'].map((id, order) => base(id, { 'face-human':'Humano', 'face-fox':'Zorro', 'face-owl':'Búho', 'face-cat':'Gato', 'face-wolf':'Lobo' }[id]!, order)) },
  { id: 'skinToneId', label: 'Tono de piel', items: ['skin-light', 'skin-medium-light', 'skin-medium', 'skin-medium-dark', 'skin-dark'].map((id, order) => base(id, { 'skin-light':'Claro', 'skin-medium-light':'Medio claro', 'skin-medium':'Medio', 'skin-medium-dark':'Medio oscuro', 'skin-dark':'Oscuro' }[id]!, order)) },
  { id: 'hairId', label: 'Cabello', items: [base('hair-none', 'Sin cabello', 0), base('hair-short', 'Corto', 1), base('hair-curly', 'Rizado', 2), base('hair-long', 'Largo', 3), boutique('hair-braids', 'Trenzas', 1, 1, 2, 'T1')] },
  { id: 'featureId', label: 'Rasgo', items: [base('feature-none', 'Ninguno', 0), base('feature-glasses', 'Gafas', 1), base('feature-freckles', 'Pecas', 2), boutique('feature-eclipse-mark', 'Marca Éclipse', 1, 1, 2, 'T1')] },
  { id: 'clothingId', label: 'Ropa', items: [base('clothing-eclipse', 'Éclipse', 0), base('clothing-field', 'Exploración', 1), boutique('clothing-orbit', 'Traje orbital', 2, 2, 4, 'T2')] },
  { id: 'accessoryId', label: 'Accesorio', items: [base('accessory-none', 'Ninguno', 0), base('accessory-pin', 'Insignia', 1), boutique('accessory-comet', 'Cometa', 1, 1, 2, 'T1'), boutique('accessory-signal', 'Señal', 2, 1, 3, 'T2', 'COMMUNICATION'), boutique('accessory-compass', 'Brújula', 3, 1, 3, 'T2', 'PRECISION'), boutique('accessory-anchor', 'Ancla', 4, 1, 3, 'T2', 'CONSISTENCY'), boutique('accessory-alliance', 'Alianza', 5, 1, 3, 'T2', 'COLLABORATION')] },
  { id: 'frameId', label: 'Marco', items: [base('frame-none', 'Ninguno', 0), base('frame-orbit', 'Órbita', 1), boutique('frame-emerald', 'Marco esmeralda', 2, 2, 5, 'T2')] },
  { id: 'backgroundId', label: 'Fondo', items: [base('background-eclipse', 'Éclipse', 0), base('background-night', 'Noche', 1), boutique('background-dawn', 'Amanecer', 3, 3, 6, 'T3')] },
] };

export type AvailabilityContext = { studentId: string; academicYearId: string; itemId: string; currentTerm: 'T1'|'T2'|'T3'|null; level: number; specialtyCategory: XpCategory|null; owned: boolean };
export type AvatarAvailabilityPort = { allows(context: AvailabilityContext): boolean | Promise<boolean> };
const terms = { T1: 1, T2: 2, T3: 3 } as const;
export function catalogueItem(itemId: string) { return avatarCatalogue.categories.find((category) => category.items.some((item) => item.id === itemId))?.items.find((item) => item.id === itemId); }
export function catalogueCategoryForItem(itemId: string) { return avatarCatalogue.categories.find((category) => category.items.some((item) => item.id === itemId))?.id; }
export function boutiqueAvailabilityStatus(input: Omit<AvailabilityContext, 'studentId'|'academicYearId'>): BoutiqueAvailabilityStatus {
  const item = catalogueItem(input.itemId); if (!item || item.access.kind === 'BASE') return 'AVAILABLE';
  if (!input.currentTerm || terms[input.currentTerm] < terms[item.access.availableFromTerm]) return 'LOCKED_TERM';
  if (input.level < item.access.minLevel) return 'LOCKED_LEVEL';
  if (item.access.requiredSpecialtyCategory && input.specialtyCategory !== item.access.requiredSpecialtyCategory) return 'LOCKED_SPECIALTY';
  return 'AVAILABLE';
}
export const availability: AvatarAvailabilityPort = { allows: (context) => { const item = catalogueItem(context.itemId); return Boolean(item && (item.access.kind === 'BASE' || (context.owned && boutiqueAvailabilityStatus(context) === 'AVAILABLE'))); } };
export const avatarCatalogueIds = new Set(avatarCatalogue.categories.flatMap((category) => category.items.map((item) => item.id)));
export type { AvatarProfile };
