import { assertGemSourceTransaction, type GemSourceTx } from '../services/transactions.js';
import { applyRtStates, applyXp } from './service.js';
import { RtStreakEmeraldEntitlementPort } from '../rt/service.js';

export type RtStreakEmeraldBaselineState = Readonly<any>;
export type GemSourceOrchestrator = { applyXp(tx: GemSourceTx, transitionIds: readonly string[]): void; applyRtScope(tx: GemSourceTx, studentId: string, termId: string): void; applyRtBaselineEntitlement(tx: GemSourceTx, expected: RtStreakEmeraldBaselineState): void };

/** Synchronous source seam; route integration remains a pending Build task. */
export function createGemSourceOrchestrator() {
  return {
    applyXp(tx: GemSourceTx, transitionIds: readonly string[]) {
      assertGemSourceTransaction(tx);
      applyXp(tx, transitionIds);
    },
    applyRtScope(tx: GemSourceTx, studentId: string, termId: string): void {
      assertGemSourceTransaction(tx);
      const states = RtStreakEmeraldEntitlementPort.listForReconciliation(studentId, termId, tx.db);
      if (states.length) applyRtStates(tx, states.map(state => ({ id:state.id, source_key:state.sourceKey, source_entry_id:state.sourceEntryId, student_id:state.studentId, term_id:state.termId, active:state.active ? 1 : 0, revision:state.revision, consumer_id:state.consumption?.consumerId ?? null, grant_id:state.consumption?.grantId ?? null, consumed_revision:state.consumption?.consumedRevision ?? null, consumed_at:state.consumption?.consumedAt ?? null })), states[0].ownerTeacherId, states[0].academicYearId);
    },
    applyRtBaselineEntitlement(tx: GemSourceTx, expected: RtStreakEmeraldBaselineState): void {
      assertGemSourceTransaction(tx);
      const actual = RtStreakEmeraldEntitlementPort.getCurrentForBaseline(expected.id, tx.db);
      if (!actual || JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('RT baseline snapshot changed.');
      applyRtStates(tx, [{ id: actual.id, source_key: actual.sourceKey, source_entry_id: actual.sourceEntryId, student_id: actual.studentId, term_id: actual.termId, active: actual.active ? 1 : 0, revision: actual.revision, consumer_id: actual.consumption?.consumerId ?? null, grant_id: actual.consumption?.grantId ?? null, consumed_revision: actual.consumption?.consumedRevision ?? null, consumed_at: actual.consumption?.consumedAt ?? null }], actual.ownerTeacherId, actual.academicYearId, true);
    },
  };
}
