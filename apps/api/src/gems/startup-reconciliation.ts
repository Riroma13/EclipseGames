import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { runImmediateTransaction, type GemSourceTx } from '../services/transactions.js';
import { createLevelGrantTransitionPort } from '../xp/level-grant-transition-port.js';
import { RtStreakEmeraldEntitlementPort } from '../rt/service.js';
import type { GemSourceOrchestrator } from './source-orchestrator.js';

export type StartupReconciliationOptions = { onStep?: (step: 'xp-completion'|'xp-page'|'rt-receipt') => void };

export function reconcileBeforeReadiness(db: Database.Database, coordinator: GemSourceOrchestrator, options: StartupReconciliationOptions = {}) {
  return runImmediateTransaction(db, randomUUID(), tx => reconcile(tx, coordinator, options));
}

function reconcile(tx: GemSourceTx, coordinator: GemSourceOrchestrator, options: StartupReconciliationOptions) {
  const xp = createLevelGrantTransitionPort(tx.db);
  const completion = xp.completeAuthoritativeLevelTransitions(tx.db);
  const all = xp.listAfter(0, Number.MAX_SAFE_INTEGER);
  if (completion.throughSequence !== (all.length ? all[all.length - 1].sequence : 0) || completion.appendedTransitions.some((row, index) => row.sequence !== (all.length - completion.appendedTransitions.length + index + 1))) throw new Error('XP completion result is inconsistent.');
  options.onStep?.('xp-completion');
  let cursor = (tx.db.prepare('SELECT last_sequence AS value FROM gem_reconciliation_cursors WHERE stream=?').get('xp-level-grant-transitions') as {value:number}|undefined)?.value;
  if (!Number.isSafeInteger(cursor) || cursor! < 0 || cursor! > completion.throughSequence) throw new Error('XP reconciliation cursor is invalid.');
  let scan = 0;
  while (scan < completion.throughSequence) {
    const page = xp.listAfter(scan, 100);
    if (!page.length || page[0].sequence !== scan + 1 || page.some((row, i) => i > 0 && row.sequence !== page[i - 1].sequence + 1) || page[page.length - 1].sequence > completion.throughSequence) throw new Error('XP reconciliation page is not contiguous.');
    coordinator.applyXp(tx, page.map(row => row.id));
    const persisted = (tx.db.prepare('SELECT last_sequence AS value FROM gem_reconciliation_cursors WHERE stream=?').get('xp-level-grant-transitions') as {value:number}).value;
    if (persisted !== Math.max(cursor!, page[page.length - 1].sequence)) throw new Error('XP reconciliation cursor did not advance exactly.');
    cursor = persisted; scan = page[page.length - 1].sequence; options.onStep?.('xp-page');
  }
  if (scan !== cursor || cursor !== completion.throughSequence || xp.listAfter(completion.throughSequence, 1).length !== 0) throw new Error('XP reconciliation terminal probe failed.');

  let after: string | null = null;
  for (;;) {
    const page = RtStreakEmeraldEntitlementPort.listCurrentForBaselineAfter(after, 100, tx.db);
    if (!page.length) break;
    if (page.some((row, index) => index > 0 && row.id <= page[index - 1].id) || (after !== null && page[0].id <= after)) throw new Error('RT baseline page is not strictly ordered.');
    for (const snapshot of page) { coordinator.applyRtBaselineEntitlement(tx, snapshot); after = snapshot.id; options.onStep?.('rt-receipt'); }
  }
  if (RtStreakEmeraldEntitlementPort.listCurrentForBaselineAfter(after, 1, tx.db).length !== 0) throw new Error('RT baseline terminal probe failed.');
}
