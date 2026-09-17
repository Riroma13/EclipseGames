import type { BoutiqueAvailabilityStatus, BoutiqueItemDto } from '@eclipse/contracts';
import { avatarCatalogue, boutiqueAvailabilityStatus, catalogueItem } from '../avatar-core/catalogue.js';

export const boutiqueItems = avatarCatalogue.categories.flatMap(category => category.items
  .filter(item => item.access.kind === 'BOUTIQUE')
  .map(item => ({ item, category: category.id })));

export function itemForPurchase(id: string) {
  const found = boutiqueItems.find(value => value.item.id === id);
  if (!found) return undefined;
  if (found.item.access.kind !== 'BOUTIQUE') return undefined;
  return { ...found, access: found.item.access };
}

export function statusFor(itemId: string, currentTerm: 'T1'|'T2'|'T3'|null, level: number, specialtyCategory: any): BoutiqueAvailabilityStatus {
  return boutiqueAvailabilityStatus({ itemId, currentTerm, level, specialtyCategory, owned: true });
}

export function mapItem(input: { itemId:string; category:string; label:string; cost:1|2|3; minLevel:number; requiredSpecialtyCategory:any; availableFromTerm:'T1'|'T2'|'T3'; owned:boolean; equipped:boolean; currentTerm:'T1'|'T2'|'T3'|null; level:number; specialtyCategory:any }): BoutiqueItemDto {
  return { id: input.itemId, category: input.category, label: input.label, cost: input.cost, minLevel: input.minLevel, requiredSpecialtyCategory: input.requiredSpecialtyCategory, availableFromTerm: input.availableFromTerm, owned: input.owned, equipped: input.equipped, status: statusFor(input.itemId, input.currentTerm, input.level, input.specialtyCategory) };
}

export { catalogueItem };
