import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase, MigrationError } from '../../src/db/migrate.js';
import { migrations } from '../../src/db/migrations.js';

const databases: Database.Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function database() {
  const value = new Database(':memory:');
  databases.push(value);
  return value;
}

describe('SQLite migrations', () => {
  it('applies migrations in order and is repeatable', () => {
    const db = database();
    expect(migrateDatabase(db, migrations)).toEqual({ applied: ['0001_foundation', '0002_auth_projection', '0003_academic_roster'] });
    expect(migrateDatabase(db, migrations)).toEqual({ applied: [] });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_metadata'").get()).toBeTruthy();
    expect(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({ count: 3 });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projection_students'").get()).toBeTruthy();
    expect(db.prepare('SELECT id FROM schema_migrations ORDER BY rowid').all()).toEqual([
      { id: '0001_foundation' },
      { id: '0002_auth_projection' },
      { id: '0003_academic_roster' },
    ]);
  });

  it('fails closed when a migration fails', () => {
    const db = database();
    expect(() => migrateDatabase(db, [{ id: '0002_broken', sql: 'CREATE TABLE broken (' }])).toThrow(MigrationError);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'broken'").get()).toBeUndefined();
    expect(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({ count: 0 });
  });

  it('rolls back the complete migration transaction on failure', () => {
    const db = database();
    expect(() => migrateDatabase(db, [{ id: '0002_partial', sql: 'CREATE TABLE partial_table (id INTEGER);\nCREATE TABLE broken (' }])).toThrow(MigrationError);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'partial_table'").get()).toBeUndefined();
  });
});
