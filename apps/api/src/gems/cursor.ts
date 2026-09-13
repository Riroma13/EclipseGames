import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const kidPattern = /^[A-Za-z0-9_-]{1,32}$/;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const salt = Buffer.from('EclipseGames/gem-cursor/hkdf-salt/v1');
const info = Buffer.from('EclipseGames/gem-ledger-cursor/aes-256-gcm/v1');
const purpose = 'gem-ledger-cursor';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type CursorScope = { ownerTeacherId:string; studentId:string; academicYearId:string };
export type CursorTuple = CursorScope & { createdAt:string; id:string };
type Key = { kid:string; key:Buffer };
export class InvalidGemCursorError extends Error { constructor() { super('Cursor is invalid.'); this.name='InvalidGemCursorError'; } }

function decodeSecret(secret: string) {
  if (!secret || secret.includes('=') || !/^[A-Za-z0-9_-]+$/.test(secret)) throw new Error('invalid');
  const bytes = Buffer.from(secret, 'base64url');
  if (bytes.length !== 32 || bytes.toString('base64url') !== secret) throw new Error('invalid');
  return bytes;
}
export function parseCursorKeys(value: string | undefined): readonly Key[] {
  if (!value) throw new Error('invalid');
  const seenKids = new Set<string>(); const seenSecrets = new Set<string>();
  const keys = value.split(',').map(part => { const pieces=part.split(':'); if(pieces.length!==2||!kidPattern.test(pieces[0])) throw new Error('invalid'); const secret=decodeSecret(pieces[1]); if(seenKids.has(pieces[0])||seenSecrets.has(pieces[1])) throw new Error('invalid'); seenKids.add(pieces[0]);seenSecrets.add(pieces[1]); return {kid:pieces[0],key:Buffer.from(hkdfSync('sha256',secret,salt,info,32))}; });
  if (!keys.length) throw new Error('invalid'); return keys;
}
function aad(scope: CursorScope) { return JSON.stringify({purpose,v:1,ownerTeacherId:scope.ownerTeacherId,studentId:scope.studentId,academicYearId:scope.academicYearId}); }
export function createCursorCodec(keys: readonly Key[]) {
  if(!keys.length) throw new Error('invalid');
  return {
    encode(tuple: CursorTuple) { const nonce=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',keys[0].key,nonce); const scope={ownerTeacherId:tuple.ownerTeacherId,studentId:tuple.studentId,academicYearId:tuple.academicYearId}; cipher.setAAD(Buffer.from(aad(scope))); const encrypted=Buffer.concat([cipher.update(Buffer.from(JSON.stringify({v:1,...tuple}))),cipher.final()]); return `v1.${keys[0].kid}.${nonce.toString('base64url')}.${encrypted.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`; },
    decode(token: string, scope: CursorScope): CursorTuple { try { if(token.length>1024){throw new Error();} const parts=token.split('.');if(parts.length!==5||parts[0]!=='v1')throw new Error();const key=keys.find(item=>item.kid===parts[1]);if(!key)throw new Error();const nonce=Buffer.from(parts[2],'base64url'),ciphertext=Buffer.from(parts[3],'base64url'),tag=Buffer.from(parts[4],'base64url');if(nonce.length!==12||tag.length!==16||nonce.toString('base64url')!==parts[2]||ciphertext.toString('base64url')!==parts[3]||tag.toString('base64url')!==parts[4])throw new Error();const decipher=createDecipheriv('aes-256-gcm',key.key,nonce);decipher.setAAD(Buffer.from(aad(scope)));decipher.setAuthTag(tag);const payload=JSON.parse(Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString('utf8'));if(payload.v!==1||payload.ownerTeacherId!==scope.ownerTeacherId||payload.studentId!==scope.studentId||payload.academicYearId!==scope.academicYearId||!uuidPattern.test(payload.ownerTeacherId)||!uuidPattern.test(payload.studentId)||!uuidPattern.test(payload.academicYearId)||!uuidPattern.test(payload.id)||!timestampPattern.test(payload.createdAt)||Number.isNaN(Date.parse(payload.createdAt)))throw new Error();const {v:_version,...tuple}=payload;return tuple as CursorTuple;}catch{throw new InvalidGemCursorError();} },
  };
}
