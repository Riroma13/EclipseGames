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
  {
    id: '0004_xp_specialties_levels_badges',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0004_xp_specialties_levels_badges.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0005_coins_assessment_advantages',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0005_coins_assessment_advantages.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0006_assessment_context_name_uniqueness',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0006_assessment_context_name_uniqueness.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0007_classroom_gameplay',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0007_classroom_gameplay.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0008_game_master_content',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0008_game_master_content.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0009_event_create_idempotency',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0009_event_create_idempotency.sql', import.meta.url)), 'utf8'),
  },
  {
    id: '0010_prompt_reveal',
    sql: readFileSync(fileURLToPath(new URL('../../drizzle/0010_prompt_reveal.sql', import.meta.url)), 'utf8'),
  },
];
