import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WINDOW_MS = 10 * 60 * 1000;

export class LeaseError extends Error {
  constructor(public readonly statusCode: number, message = 'Show Student access is unavailable.') { super(message); this.name = 'LeaseError'; }
}

export function parseShowStudentTtlSeconds(value = process.env.SHOW_STUDENT_TTL_SECONDS ?? '120'): number {
  if (!/^\d+$/.test(value)) throw new Error('SHOW_STUDENT_TTL_SECONDS must be an integer from 30 to 300.');
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds < 30 || seconds > 300) throw new Error('SHOW_STUDENT_TTL_SECONDS must be an integer from 30 to 300.');
  return seconds;
}

export type LeaseCreateInput = { teacherId: string; teacherSessionId: string; groupId: string; studentId: string; idempotencyKey: string; receiptFingerprint?: string };
export type LeaseMaterial = { grantId: string; version: number; studentId: string; groupId: string; accessToken: string; accessCode: string; accessUrl: string; expiresAt: string };
type LeaseRecord = Omit<LeaseMaterial, 'accessToken' | 'accessCode'> & { teacherId: string; teacherSessionId: string; tokenHash: string; codeHash: string; viewerHash?: string; encryptedMaterial: string; redeemed: boolean; revoked: boolean; createdAt: number; receiptFingerprint?: string };
type Attempt = { key: string; at: number };

export type LeaseEvent = 'created' | 'replaced' | 'revoked' | 'expired' | 'restarted' | 'redeemed';

function hash(value: string) { return createHash('sha256').update(value).digest(); }
function sameHash(a: string, b: string) { const aa = Buffer.from(a, 'hex'); const bb = hash(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }
function crockford(bytes: Buffer) { const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; let n = BigInt(`0x${bytes.toString('hex')}`); let out = ''; for (let i = 0; i < 13; i++) { out = alphabet[Number(n & 31n)] + out; n >>= 5n; } return out; }

export class LeaseRegistry {
  private readonly records = new Map<string, LeaseRecord>();
  private readonly idempotency = new Map<string, string>();
  private readonly attempts = new Map<string, Attempt[]>();
  private readonly encryptionKey = randomBytes(32);
  private readonly now: () => Date;
  private currentByTeacher = new Map<string, string>();

  constructor(private readonly options: { ttlSeconds: number; now?: () => Date; onEvent?: (event: LeaseEvent, grantId: string) => void; isTeacherSessionValid?: (teacherId: string, teacherSessionId: string) => boolean }) {
    parseShowStudentTtlSeconds(String(options.ttlSeconds));
    this.now = options.now ?? (() => new Date());
  }

  private material(record: LeaseRecord): LeaseMaterial {
    const [ivEncoded, tagEncoded, encryptedEncoded] = record.encryptedMaterial.split('.');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivEncoded, 'base64url'));
    const tag = Buffer.from(tagEncoded, 'base64url');
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, 'base64url')), decipher.final()]).toString()) as LeaseMaterial;
  }
  private seal(material: LeaseMaterial) {
    const iv = randomBytes(18); const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(material)), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  }
  private active(record: LeaseRecord, at = this.now().getTime()) {
    if (record.revoked || at >= Date.parse(record.expiresAt)) { if (!record.revoked && at >= Date.parse(record.expiresAt)) this.options.onEvent?.('expired', record.grantId); return false; }
    return true;
  }
  private fail(): never { throw new LeaseError(404); }

  create(input: LeaseCreateInput): LeaseMaterial {
    if (!UUID_V4.test(input.idempotencyKey)) throw new LeaseError(422, 'A UUID v4 Idempotency-Key is required.');
    const priorId = this.idempotency.get(`${input.teacherId}:${input.idempotencyKey}`);
    if (priorId) { const prior = this.records.get(priorId)!; if (prior.studentId !== input.studentId || prior.groupId !== input.groupId || prior.receiptFingerprint !== input.receiptFingerprint) throw new LeaseError(409, 'Idempotency-Key was already used for a different request.'); if (this.active(prior)) { const value = this.material(prior); Object.defineProperty(value, 'replay', { value: true }); return value; } this.fail(); }
    const previousId = this.currentByTeacher.get(input.teacherId); if (previousId) { const previous = this.records.get(previousId); if (previous && this.active(previous)) { previous.revoked = true; this.options.onEvent?.('replaced', previous.grantId); } }
    const now = this.now().getTime(); const grantId = randomUUID(); const accessToken = randomBytes(16).toString('base64url'); const accessCode = crockford(randomBytes(8));
    const material: LeaseMaterial = { grantId, version: 1, studentId: input.studentId, groupId: input.groupId, accessToken, accessCode, accessUrl: `/#/show-student?token=${encodeURIComponent(accessToken)}`, expiresAt: new Date(now + this.options.ttlSeconds * 1000).toISOString() };
    const record: LeaseRecord = { grantId, version: 1, studentId: input.studentId, groupId: input.groupId, accessUrl: material.accessUrl, expiresAt: material.expiresAt, teacherId: input.teacherId, teacherSessionId: input.teacherSessionId, tokenHash: hash(accessToken).toString('hex'), codeHash: hash(accessCode).toString('hex'), encryptedMaterial: this.seal(material), redeemed: false, revoked: false, createdAt: now, receiptFingerprint: input.receiptFingerprint };
    this.records.set(grantId, record); this.idempotency.set(`${input.teacherId}:${input.idempotencyKey}`, grantId); this.currentByTeacher.set(input.teacherId, grantId); this.options.onEvent?.('created', grantId); return material;
  }

  exchange(input: { token?: string; code?: string; clientId: string }) {
    if ((input.token ? 1 : 0) + (input.code ? 1 : 0) !== 1) throw new LeaseError(422, 'Exactly one exchange credential is required.');
    const now = this.now().getTime();
    if (input.code && this.throttled(`client:${input.clientId}`, now, 5)) throw new LeaseError(429, 'Code exchange is temporarily throttled.');
    const record = [...this.records.values()].find(item => input.token ? sameHash(item.tokenHash, input.token) : sameHash(item.codeHash, input.code!));
    // An unknown code cannot identify a teacher. When this process has one
    // active grant, it is the authoritative server-side scope for bootstrap
    // attempts; with multiple grants, retain generic client-only handling
    // rather than guessing and leaking ownership.
    const scopedRecord = record ?? (input.code ? this.singleActiveGrant(now) : undefined);
    const grantAttemptKey = scopedRecord ? `teacher:${scopedRecord.teacherId}:${scopedRecord.grantId}` : undefined;
    if (input.code && grantAttemptKey && this.throttled(grantAttemptKey, now, 20)) throw new LeaseError(429, 'Code exchange is temporarily throttled.');
    if (input.code) {
      this.recordAttempt(`client:${input.clientId}`, now);
      if (grantAttemptKey) this.recordAttempt(grantAttemptKey, now);
    }
    if (!record) this.fail();
    if (!this.active(record, now) || record.redeemed || (input.code && !sameHash(record.codeHash, input.code!))) this.fail();
    record.redeemed = true; const cookie = randomBytes(16).toString('base64url'); record.viewerHash = hash(cookie).toString('hex'); this.options.onEvent?.('redeemed', record.grantId);
    return { cookie, expiresAt: record.expiresAt, cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/v1/show-student', maxAge: this.options.ttlSeconds } };
  }

  readViewer(input: { cookie: string; teacherId?: string; teacherSessionId?: string; groupId?: string; studentId?: string }) {
    const record = [...this.records.values()].find(item => item.viewerHash && sameHash(item.viewerHash, input.cookie));
    if (!record) this.fail();
    if (!this.active(record) || record.version !== 1 || (this.options.isTeacherSessionValid && !this.options.isTeacherSessionValid(record.teacherId, record.teacherSessionId)) || (input.teacherId && record.teacherId !== input.teacherId) || (input.teacherSessionId && record.teacherSessionId !== input.teacherSessionId) || (input.groupId && record.groupId !== input.groupId) || (input.studentId && record.studentId !== input.studentId)) this.fail();
    return { teacherId: record.teacherId, teacherSessionId: record.teacherSessionId, studentId: record.studentId, groupId: record.groupId, grantId: record.grantId, version: record.version, expiresAt: record.expiresAt };
  }

  revoke(input: Pick<LeaseCreateInput, 'teacherId' | 'teacherSessionId' | 'groupId' | 'studentId'>) { const id = this.currentByTeacher.get(input.teacherId); const record = id ? this.records.get(id) : undefined; if (record && record.teacherSessionId === input.teacherSessionId && record.groupId === input.groupId && record.studentId === input.studentId) { record.revoked = true; this.options.onEvent?.('revoked', record.grantId); } }
  revokeGroup(input: Pick<LeaseCreateInput, 'teacherId' | 'teacherSessionId' | 'groupId'>) { const id = this.currentByTeacher.get(input.teacherId); const record = id ? this.records.get(id) : undefined; if (record && record.teacherSessionId === input.teacherSessionId && record.groupId === input.groupId) { record.revoked = true; this.options.onEvent?.('revoked', record.grantId); } }
  current(input: { teacherId: string; teacherSessionId: string; groupId: string }) {
    const id = this.currentByTeacher.get(input.teacherId); const record = id ? this.records.get(id) : undefined;
    if (!record || record.teacherSessionId !== input.teacherSessionId || record.groupId !== input.groupId || !this.active(record)) return undefined;
    return this.material(record);
  }
  restart() { for (const record of this.records.values()) record.revoked = true; this.options.onEvent?.('restarted', ''); this.attempts.clear(); this.currentByTeacher.clear(); }
  debugRecords() { return [...this.records.values()]; }
  private singleActiveGrant(now: number) {
    const active = [...this.records.values()].filter(record => this.active(record, now));
    return active.length === 1 ? active[0] : undefined;
  }
  private throttled(key: string, now: number, limit: number) { return (this.attempts.get(key) ?? []).filter(item => now - item.at < WINDOW_MS).length >= limit; }
  private recordAttempt(key: string, at: number) { this.attempts.set(key, [...(this.attempts.get(key) ?? []).filter(item => at - item.at < WINDOW_MS), { key, at }]); }
}
