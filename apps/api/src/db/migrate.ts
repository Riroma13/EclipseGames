import type Database from 'better-sqlite3';
import { migrations, type Migration } from './migrations.js';

export class MigrationError extends Error {
  constructor(public readonly migrationId: string, cause: unknown) {
    super(`Migration ${migrationId} failed; startup is blocked.`, { cause });
    this.name = 'MigrationError';
  }
}

export function migrateDatabase(db: Database.Database, pendingMigrations: Migration[] = migrations) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as { id: string }[]).map((row) => row.id),
  );
  const appliedNow: string[] = [];

  for (const migration of pendingMigrations) {
    if (applied.has(migration.id)) continue;
    try {
      db.transaction(() => {
        db.exec(migration.sql);
        db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migration.id, new Date().toISOString());
      })();
      appliedNow.push(migration.id);
    } catch (cause) {
      throw new MigrationError(migration.id, cause);
    }
  }

  return { applied: appliedNow };
}
