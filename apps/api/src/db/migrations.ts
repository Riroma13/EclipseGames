import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Migration = { id: string; sql: string };

export const migrations: Migration[] = [
  {
    id: '0001_foundation',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0001_foundation.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0002_auth_projection',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0002_auth_projection.sql', import.meta.url)), 'utf8'),
  },
];
