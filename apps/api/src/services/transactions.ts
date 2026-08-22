import type Database from 'better-sqlite3';

export function runTransaction<T>(database: Database.Database, operation: () => T): T {
  return database.transaction(operation)();
}
