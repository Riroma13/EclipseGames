import type Database from 'better-sqlite3';
import type { HistoryPageDto } from '@eclipse/contracts';
import { composeHistory, type HistoryContext } from './adapters.js';
import type { HistoryCursor } from './cursor.js';
import { createHistoryCursorCodec } from './cursor.js';

export function readHistory(db:Database.Database, context:HistoryContext, codec:ReturnType<typeof createHistoryCursorCodec>):HistoryPageDto {
  const rows=composeHistory(db,context);
  const page=rows.slice(0,context.query.limit);
  const last=page.at(-1);
  const nextCursor=rows.length>context.query.limit && last ? codec.encode({ownerTeacherId:context.ownerTeacherId,groupId:context.groupId,academicYearId:context.academicYearId,filterFingerprint:JSON.stringify({...context.query,cursor:undefined}),occurredAt:last.occurredAt,family:last.family,sourceId:last.sourceId,itemId:last.itemId}) : null;
  return {items:page.map(r=>r.dto),nextCursor};
}

export type { HistoryCursor };
