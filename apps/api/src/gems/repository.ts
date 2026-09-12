import type Database from 'better-sqlite3';

export function balances(db: Database.Database, studentId: string, academicYearId: string) {
  const rows = db.prepare(`SELECT currency, COALESCE(SUM(amount),0) AS balance FROM gem_ledger WHERE student_id=? AND academic_year_id=? GROUP BY currency`).all(studentId, academicYearId) as Array<{currency:string;balance:number}>;
  const result = { EMERALD: 0, RUBY: 0, DIAMOND: 0 };
  for (const row of rows) if (row.currency in result) result[row.currency as keyof typeof result] = Number(row.balance);
  return { studentId, academicYearId, balances: result };
}

export function ledger(db: Database.Database, studentId: string, academicYearId: string, limit: number, cursor: { createdAt:string; id:string } | null) {
  const clause = cursor ? ' AND (created_at > ? OR (created_at = ? AND id > ?))' : '';
  const args = cursor ? [studentId, academicYearId, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1] : [studentId, academicYearId, limit + 1];
  const rows = db.prepare(`SELECT currency,amount,movement_kind AS kind,created_at AS createdAt,id FROM gem_ledger WHERE student_id=? AND academic_year_id=?${clause} ORDER BY created_at,id LIMIT ?`).all(...args) as Array<{currency:any;amount:any;kind:any;createdAt:string;id:string}>;
  const more = rows.length > limit;
  const items = rows.slice(0, limit).map(({ currency, amount, kind, createdAt }) => ({ currency, amount, kind, createdAt }));
  const last = rows[limit - 1];
  return { entries: items, next: more && last ? { createdAt: last.createdAt, id: last.id } : null };
}

type ActionStateRow = {
  rewardId: string | null; rewardTier: string | null; rewardState: string | null;
  redemptionId: string | null; redemptionCurrency: string | null; redemptionCost: number | null; redemptionState: string | null;
};

export function actionState(db: Database.Database, studentId: string, academicYearId: string, assessmentContextId: string) {
  const row = db.prepare(`SELECT rr.id AS rewardId, rr.tier AS rewardTier, rr.state AS rewardState,
    ar.id AS redemptionId, ar.currency AS redemptionCurrency, ar.cost AS redemptionCost, ar.state AS redemptionState
    FROM (SELECT 1 AS marker) anchor
    LEFT JOIN gem_result_rewards rr ON rr.student_id=? AND rr.academic_year_id=? AND rr.assessment_context_id=?
    LEFT JOIN gem_advantage_redemptions ar ON ar.student_id=? AND ar.academic_year_id=? AND ar.assessment_context_id=?`).get(
      studentId, academicYearId, assessmentContextId, studentId, academicYearId, assessmentContextId) as ActionStateRow;
  return {
    studentId, academicYearId, assessmentContextId,
    resultReward: row.rewardId ? { id: row.rewardId, tier: row.rewardTier, state: row.rewardState } : null,
    advantageRedemption: row.redemptionId ? { id: row.redemptionId, currency: row.redemptionCurrency, cost: row.redemptionCost, state: row.redemptionState } : null,
  };
}
