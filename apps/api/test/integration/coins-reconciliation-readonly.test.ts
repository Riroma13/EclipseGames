import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';

describe('legacy coin schema remains queryable evidence', () => {
  it('does not add a coin writer or reconciler dependency to the gem schema', () => {
    const db = new Database(':memory:');
    try {
      migrateDatabase(db, migrations);
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='coin_ledger'").get()).toBeTruthy();
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='gem_ledger'").get()).toBeTruthy();
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='coin_ledger'").get()).toEqual({ name: 'coin_ledger' });
    } finally { db.close(); }
  });
});
