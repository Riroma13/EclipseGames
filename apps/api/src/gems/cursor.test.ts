import { describe, expect, it } from 'vitest';
import { createCursorCodec, parseCursorKeys } from './cursor.js';

const key = Buffer.alloc(32, 0).toString('base64url');
const oldKey = Buffer.alloc(32, 1).toString('base64url');
const scope = { ownerTeacherId: '00000000-0000-4000-8000-000000000001', studentId: '00000000-0000-4000-8000-000000000002', academicYearId: '00000000-0000-4000-8000-000000000003' };
const tuple = { ...scope, createdAt: '2026-09-11T21:00:00.000Z', id: '00000000-0000-4000-8000-000000000004' };

describe('gem cursor codec', () => {
  it('encrypts, authenticates, and binds cursors to scope', () => {
    const codec = createCursorCodec(parseCursorKeys(`active:${key}`));
    const token = codec.encode(tuple);
    expect(token.startsWith('v1.active.')).toBe(true);
    expect(codec.decode(token, scope)).toEqual(tuple);
    expect(() => codec.decode(token, { ...scope, studentId: scope.ownerTeacherId })).toThrow('Cursor is invalid.');
    const parts = token.split('.');
    parts[3] = `${parts[3][0] === 'A' ? 'B' : 'A'}${parts[3].slice(1)}`;
    expect(() => codec.decode(parts.join('.'), scope)).toThrow('Cursor is invalid.');
  });

  it('accepts retained keys and rejects malformed keyrings', () => {
    const codec = createCursorCodec(parseCursorKeys(`new:${key},old:${oldKey}`));
    const oldCodec = createCursorCodec(parseCursorKeys(`old:${oldKey}`));
    expect(codec.decode(oldCodec.encode(tuple), scope)).toEqual(tuple);
    expect(() => parseCursorKeys(`new:${key},new:${key}`)).toThrow();
    expect(() => parseCursorKeys(`new:${'A'.repeat(42)}`)).toThrow();
  });
});
