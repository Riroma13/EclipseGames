import type Database from 'better-sqlite3';

export interface DatabasePort {
  readonly database: Database.Database;
  close(): void;
}
