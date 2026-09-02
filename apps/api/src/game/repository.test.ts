import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as repository from './repository.js';

const databases: Database.Database[] = [];
const ids = { teacher: '00000000-0000-4000-8000-000000000501', year: '00000000-0000-4000-8000-000000000502', group: '00000000-0000-4000-8000-000000000503', session: '00000000-0000-4000-8000-000000000504' };

afterEach(() => { for (const database of databases.splice(0)) database.close(); });

function database() {
  const value = new Database(':memory:');
  value.pragma('foreign_keys = ON');
  migrateDatabase(value, migrations);
  value.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(ids.teacher, 'prompt@example.test', 'hash', 'now');
  value.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, 'Prompt', '2026-09-01', '2027-07-01', 'now');
  value.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'Prompt group', 'now');
  value.prepare(`INSERT INTO minigame_sessions
    (id,owner_teacher_id,group_id,kind,title,prompt,duration_seconds,status,remaining_seconds,draw_index,created_at,updated_at,team_count,team_assignments,prompt_deck_prompts)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ids.session, ids.teacher, ids.group, 'PROMPT_DECK', 'Deck', 'First', 0, 'READY', 0, 0, 'now', 'now', 0, '{}', JSON.stringify(['First', 'Second', 'Third']));
  databases.push(value);
  return value;
}

describe('Prompt Deck repository concurrency', () => {
  it('rejects a stale prompt selection after a newer selection wins', () => {
    const db = database();

    expect(repository.advancePromptAtomically(db, ids.session, 0, 'Second', 1, 'later')).toBe(1);
    expect(repository.advancePromptAtomically(db, ids.session, 0, 'Third', 2, 'stale')).toBe(0);
    expect(db.prepare('SELECT prompt,draw_index AS drawIndex,prompt_revealed AS promptRevealed FROM minigame_sessions WHERE id=?').get(ids.session)).toEqual({ prompt: 'Second', drawIndex: 1, promptRevealed: 0 });
  });
});
