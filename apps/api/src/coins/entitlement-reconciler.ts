import type Database from 'better-sqlite3';
import { createLevelGrantTransitionPort } from '../xp/level-grant-transition-port.js';
import * as repository from './repository.js';
import * as service from './service.js';

/** Full replay is intentionally cursorless: every run starts at sequence zero. */
export function reconcileEntitlements(db: Database.Database) {
  const port=createLevelGrantTransitionPort(db);
  return db.transaction(() => {
    let sequence=0, applied=0;
    for (;;) {
      const page=port.listAfter(sequence,100); if(!page.length) break;
      for(const transition of page) {
        const sourceId=`XP_LEVEL_TRANSITION:${transition.id}`;
        const exists=db.prepare('SELECT id FROM coin_ledger WHERE source_transition_id=?').get(sourceId);
        if(!exists) {
          if(transition.kind==='GRANT' || transition.kind==='REINSTATE') db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,source_transition_id,created_at) VALUES (?,?,?,?,?,?,?)').run(sourceId,transition.studentId,transition.academicYearId,1,'LEVEL_ENTITLEMENT',sourceId,transition.occurredAt);
           else {
             const grant=db.prepare(`SELECT l.id FROM coin_ledger l JOIN xp_level_grant_transitions t ON l.source_transition_id=('XP_LEVEL_TRANSITION:' || t.id) WHERE t.unlock_id=? AND l.source='LEVEL_ENTITLEMENT' AND l.amount=1 ORDER BY l.created_at DESC,l.id DESC LIMIT 1`).get(transition.unlockId) as {id:string}|undefined;
             if(!grant) throw new Error('Level entitlement grant is missing.');
             service.reverseForEntitlement(db,grant.id,'LEVEL_ENTITLEMENT_REVOKE',sourceId);
           }
          applied+=1;
        }
        sequence=transition.sequence;
      }
    }
    return { applied, lastSequence: sequence };
  })();
}
