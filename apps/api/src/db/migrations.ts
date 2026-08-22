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
  {
    id: '0003_academic_roster',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0003_academic_roster.sql', import.meta.url)), 'utf8'),
  },
];
