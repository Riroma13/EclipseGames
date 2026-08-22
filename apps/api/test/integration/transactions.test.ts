import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';
import { runTransaction } from '../../src/services/transactions.js';

describe('service transactions', () => {
  it('rolls back all writes when a service operation fails', () => {
    const database = new Database(':memory:');
    migrateDatabase(database, migrations);

    expect(() => runTransaction(database, () => {
      database.prepare('INSERT INTO app_metadata (key, value) VALUES (?, ?)').run('temporary', 'private');
      throw new Error('operation failed');
    })).toThrow('operation failed');

    expect(database.prepare('SELECT * FROM app_metadata WHERE key = ?').get('temporary')).toBeUndefined();
    database.close();
  });
});
