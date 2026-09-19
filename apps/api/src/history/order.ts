import type { HistoryFamily } from './contracts.js';
export const historyFamilyRank: Readonly<Record<HistoryFamily, number>> = { SESSION:0, XP:1, RT:2, GEM:3, LEGACY_COIN:4, BEHAVIOUR:5, RUBRIC:6, TERM_CLOSE:7, AVATAR:8, BOUTIQUE:9, CLASSROOM_EVENT:10, CHALLENGE:11, MINIGAME:12 };
export type HistoryOrderTuple = { occurredAt:string; family:HistoryFamily; sourceId:string; itemId:string };
export function compareHistoryOrder(a:HistoryOrderTuple, b:HistoryOrderTuple) { const date = Date.parse(b.occurredAt)-Date.parse(a.occurredAt); if(date) return date; const family = historyFamilyRank[a.family]-historyFamilyRank[b.family]; if(family) return family; const source = b.sourceId.localeCompare(a.sourceId); return source || b.itemId.localeCompare(a.itemId); }
