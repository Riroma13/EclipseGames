import type { CoinSummaryDto, CoinRewardDto } from '@eclipse/contracts';
import type { CoinEntry } from './repository.js';
export const mapSummary = (value: CoinSummaryDto): CoinSummaryDto => value;
export const mapEntry = (value: CoinEntry) => ({ id:value.id, amount:value.amount, source:value.source, createdAt:value.createdAt, correctionOfId:value.correctionOfId });
export const mapReward = (value: any): CoinRewardDto => ({ id:value.id, name:value.name, cost:value.cost, type:value.type });
