import { afterAll, describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { validateSqlitePath } from '../../src/db/path.js';
import { openDatabase } from '../../src/db/client.js';

const urlShapedValue = 'postgresql://placeholder.invalid:5432/database';

afterAll(() => {
  // The regression must not create URL-derived filesystem entries.
  expect(readdirSync('apps/api')).not.toContain('postgresql:');
});

describe('SQLite database path validation', () => {
  it('rejects URL-shaped values before filesystem access', () => {
    expect(() => validateSqlitePath(urlShapedValue)).toThrow('DATABASE_URL must be a local SQLite path.');
    expect(() => openDatabase(urlShapedValue)).toThrow('DATABASE_URL must be a local SQLite path.');
    expect(() => validateSqlitePath('./data/eclipse.sqlite')).not.toThrow();
    expect(() => validateSqlitePath('/data/eclipse.sqlite')).not.toThrow();
  });
});
