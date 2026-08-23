export type XpBonusEligibilityPort = { specialtyBonusAllowed: () => boolean | Promise<boolean> };
export const alwaysAllowXpBonus: XpBonusEligibilityPort = { specialtyBonusAllowed: () => true };
