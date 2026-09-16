import { describe, expect, it, vi } from 'vitest';
import { LeaseError, LeaseRegistry, parseShowStudentTtlSeconds } from './lease-registry.js';
import type { LeaseCreateResult, LeaseIssuance, LeaseReplayReceipt } from './lease-registry.js';

const key = '00000000-0000-4000-8000-000000000001';
const input = (overrides = {}) => ({ teacherId: 'teacher-1', teacherSessionId: 'session-1', groupId: 'group-1', studentId: 'student-1', idempotencyKey: key, ...overrides });

function issuance(result: LeaseCreateResult): LeaseIssuance {
  if (result.replay !== false) throw new Error('Expected a first-issuance lease result.');
  return result;
}

function replayReceipt(result: LeaseCreateResult): LeaseReplayReceipt {
  if (result.replay !== true) throw new Error('Expected a replay lease receipt.');
  return result;
}

describe('process-local Show Student lease security', () => {
  it('creates secrets once and deterministically replays only a non-secret receipt', () => {
    const registry = new LeaseRegistry({ ttlSeconds: 120, now: () => new Date('2026-01-01T00:00:00.000Z') });
    const first = issuance(registry.create(input()));
    const replay = replayReceipt(registry.create(input()));
    expect(replay).toEqual({ grantId: first.grantId, expiresAt: first.expiresAt, replay: true });
    expect(replay).not.toHaveProperty('accessToken');
    expect(replay).not.toHaveProperty('accessCode');
    expect(replay).not.toHaveProperty('accessUrl');
    expect(first.accessUrl).toContain(first.accessToken);
    expect(first.accessToken).not.toContain('student-1');
    expect(first.accessCode.length).toBeGreaterThanOrEqual(11);
    expect(Buffer.from(first.accessToken, 'base64url').length).toBeGreaterThanOrEqual(16);
    expect(JSON.stringify(registry.debugRecords())).not.toContain(first.accessToken);
    expect(JSON.stringify(registry.debugRecords())).not.toContain(first.accessCode);
  });

  it('rejects idempotency conflicts, cross-lease credentials, and guessed/replayed secrets', () => {
    const registry = new LeaseRegistry({ ttlSeconds: 120 });
    const first = issuance(registry.create(input()));
    expect(() => registry.create(input({ studentId: 'student-2' }))).toThrowError(LeaseError);
    expect(() => registry.exchange({ code: first.accessCode, clientId: 'client' })).not.toThrow();
    expect(() => registry.exchange({ code: first.accessCode, clientId: 'client' })).toThrowError(LeaseError);
    const second = issuance(registry.create(input({ idempotencyKey: '00000000-0000-4000-8000-000000000002', studentId: 'student-2' })));
    expect(() => registry.readViewer({ cookie: 'wrong', teacherId: 'teacher-1', teacherSessionId: 'session-1', groupId: second.groupId, studentId: second.studentId })).toThrowError(LeaseError);
    expect(() => registry.exchange({ code: '0000000000000', clientId: 'client' })).toThrowError(LeaseError);
  });

  it('allows exactly one concurrent exchange and validates the opaque viewer cookie server-side', async () => {
    const registry = new LeaseRegistry({ ttlSeconds: 120 });
    const created = issuance(registry.create(input()));
    const results = await Promise.allSettled([1, 2, 3].map(() => Promise.resolve().then(() => registry.exchange({ token: created.accessToken, clientId: 'client' }))));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const cookie = (results.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>).value.cookie;
    expect(registry.readViewer({ cookie, teacherId: 'teacher-1', teacherSessionId: 'session-1' })).toMatchObject({ studentId: 'student-1' });
    expect(() => registry.readViewer({ cookie: 'wrong', teacherId: 'teacher-1', teacherSessionId: 'session-1' })).toThrowError(LeaseError);
  });

  it('fails closed when the authoritative issuing teacher session expires', () => {
    let sessionExpiresAt = Date.now() + 60_000;
    const registry = new LeaseRegistry({ ttlSeconds: 120, isTeacherSessionValid: () => sessionExpiresAt > Date.now() });
    const created = issuance(registry.create(input()));
    const cookie = registry.exchange({ token: created.accessToken, clientId: 'client' }).cookie;
    expect(registry.readViewer({ cookie })).toMatchObject({ teacherSessionId: 'session-1' });
    sessionExpiresAt = Date.now() - 1;
    expect(() => registry.readViewer({ cookie })).toThrowError(LeaseError);
  });

  it('enforces expiry boundaries, replacement/revoke events, and restart fail-closed', () => {
    let now = new Date('2026-01-01T00:00:00.000Z'); const onEvent = vi.fn();
    const registry = new LeaseRegistry({ ttlSeconds: 30, now: () => now, onEvent });
    const first = issuance(registry.create(input())); now = new Date('2026-01-01T00:00:30.000Z');
    expect(() => registry.readViewer({ cookie: first.accessToken, teacherId: 'teacher-1', teacherSessionId: 'session-1' })).toThrowError(LeaseError);
    const second = issuance(registry.create(input({ idempotencyKey: '00000000-0000-4000-8000-000000000002' }))); registry.revoke(input());
    expect(() => registry.exchange({ code: second.accessCode, clientId: 'client' })).toThrowError(LeaseError);
    expect(onEvent).toHaveBeenCalled(); registry.restart();
    expect(() => registry.exchange({ code: first.accessCode, clientId: 'client' })).toThrowError(LeaseError);
  });

  it('throttles code attempts per client and per teacher/grant in rolling ten-minute windows', () => {
    const registry = new LeaseRegistry({ ttlSeconds: 120 }); const created = issuance(registry.create(input()));
    for (let i = 0; i < 5; i++) expect(() => registry.exchange({ code: 'bad-code', clientId: 'client' })).toThrowError(LeaseError);
    expect(() => registry.exchange({ code: 'bad-code', clientId: 'client' })).toThrowError(/throttled/i);
    for (let i = 0; i < 19; i++) expect(() => registry.exchange({ code: 'bad-code', clientId: `other-${i}` })).toThrowError(LeaseError);
    expect(() => registry.exchange({ code: 'bad-code', clientId: 'other-19' })).toThrowError(/throttled/i);
    expect(created.accessCode).not.toBe('bad-code');
  });

  it('recovers both independent buckets after the rolling window expires', () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const registry = new LeaseRegistry({ ttlSeconds: 120, now: () => now });
    registry.create(input());
    for (let i = 0; i < 5; i++) expect(() => registry.exchange({ code: 'bad-code', clientId: 'client' })).toThrowError(LeaseError);
    for (let i = 0; i < 20; i++) expect(() => registry.exchange({ code: 'bad-code', clientId: `other-${i}` })).toThrowError(LeaseError);
    now = new Date('2026-01-01T00:10:00.001Z');
    expect(() => registry.exchange({ code: 'bad-code', clientId: 'client' })).toThrowError(LeaseError);
    expect(() => registry.exchange({ code: 'bad-code', clientId: 'other-20' })).toThrowError(LeaseError);
  });

  it('validates the configured TTL and receipt fingerprint replay/conflict', () => {
    expect(() => parseShowStudentTtlSeconds('29')).toThrow(); expect(parseShowStudentTtlSeconds('300')).toBe(300);
    const registry = new LeaseRegistry({ ttlSeconds: 120 }); const receipt = issuance(registry.create(input({ receiptFingerprint: 'fp' })));
    expect(replayReceipt(registry.create(input({ receiptFingerprint: 'fp' })))).toMatchObject({ grantId: receipt.grantId, expiresAt: receipt.expiresAt, replay: true });
    expect(() => registry.create(input({ receiptFingerprint: 'different' }))).toThrowError(LeaseError);
  });
});
