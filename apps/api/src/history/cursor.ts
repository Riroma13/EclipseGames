import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { CursorKey } from '../gems/cursor.js';
import { historyFamilies } from './contracts.js';
import type { HistoryOrderTuple } from './order.js';
const purpose = 'history';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type HistoryCursorScope={ownerTeacherId:string;groupId:string;academicYearId:string;filterFingerprint:string};
export type HistoryCursor=HistoryCursorScope&HistoryOrderTuple;
export class InvalidHistoryCursorError extends Error{constructor(){super('Cursor is invalid.');this.name='InvalidHistoryCursorError';}}
const aad=(scope:HistoryCursorScope)=>JSON.stringify({purpose,v:1,...scope});
export function createHistoryCursorCodec(keys:readonly CursorKey[]){if(!keys.length)throw new Error('invalid');return{
  encode(cursor:HistoryCursor){const nonce=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',keys[0].key,nonce);const scope={ownerTeacherId:cursor.ownerTeacherId,groupId:cursor.groupId,academicYearId:cursor.academicYearId,filterFingerprint:cursor.filterFingerprint};cipher.setAAD(Buffer.from(aad(scope)));const body=Buffer.concat([cipher.update(JSON.stringify({...cursor,v:1})),cipher.final()]);return `v1.${keys[0].kid}.${nonce.toString('base64url')}.${body.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;},
  decode(token:string,scope:HistoryCursorScope):HistoryCursor{try{if(token.length>1024)throw new Error();const p=token.split('.');if(p.length!==5||p[0]!=='v1')throw new Error();const key=keys.find(k=>k.kid===p[1]);if(!key)throw new Error();const nonce=Buffer.from(p[2],'base64url'),body=Buffer.from(p[3],'base64url'),tag=Buffer.from(p[4],'base64url');if(nonce.length!==12||tag.length!==16)throw new Error();const decipher=createDecipheriv('aes-256-gcm',key.key,nonce);decipher.setAAD(Buffer.from(aad(scope)));decipher.setAuthTag(tag);const value=JSON.parse(Buffer.concat([decipher.update(body),decipher.final()]).toString());const same=value.ownerTeacherId===scope.ownerTeacherId&&value.groupId===scope.groupId&&value.academicYearId===scope.academicYearId&&value.filterFingerprint===scope.filterFingerprint;if(value.v!==1||!same||!historyFamilies.includes(value.family)||!uuid.test(value.ownerTeacherId)||!uuid.test(value.groupId)||!uuid.test(value.academicYearId)||!value.filterFingerprint||!value.sourceId||!value.itemId||Number.isNaN(Date.parse(value.occurredAt)))throw new Error();const {v:_version,...cursor}=value;return cursor as HistoryCursor;}catch{throw new InvalidHistoryCursorError();}}
};}
