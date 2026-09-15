import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runImmediateTransactionAsync } from './transactions.js';

describe('async immediate transaction boundary', () => {
  it('holds the transaction across awaited work and rolls back generated-artifact failures', async () => {
    const db = new Database(':memory:');
    db.exec('CREATE TABLE artifacts (value TEXT NOT NULL)');
    await expect(runImmediateTransactionAsync(db, 'test', async ({ db: tx }) => {
      expect(tx.inTransaction).toBe(true);
      tx.prepare('INSERT INTO artifacts VALUES (?)').run('snapshot-before-bytes');
      await Promise.resolve();
      throw new Error('xlsx generation failed');
    })).rejects.toThrow('xlsx generation failed');
    expect(db.inTransaction).toBe(false);
    expect(db.prepare('SELECT * FROM artifacts').all()).toEqual([]);
    db.close();
  });
});
