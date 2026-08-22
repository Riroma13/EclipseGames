import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrateDatabase } from './migrate.js';
import { validateSqlitePath } from './path.js';
import * as schema from './schema.js';

export function openDatabase(filename: string) {
  validateSqlitePath(filename);
  mkdirSync(dirname(filename), { recursive: true });
  const database = new Database(filename);
  database.pragma('foreign_keys = ON');
  try {
    migrateDatabase(database);
    return { database, drizzle: drizzle(database, { schema }), close: () => database.close() };
  } catch (error) {
    database.close();
    throw error;
  }
}
