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
    expect(migrateDatabase(db, migrations)).toEqual({ applied: ['0001_foundation', '0002_auth_projection', '0003_academic_roster', '0004_xp_specialties_levels_badges', '0005_coins_assessment_advantages', '0006_assessment_context_name_uniqueness', '0007_classroom_gameplay', '0008_game_master_content', '0009_event_create_idempotency', '0010_prompt_reveal'] });
    expect(migrateDatabase(db, migrations)).toEqual({ applied: [] });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_metadata'").get()).toBeTruthy();
    expect(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({ count: 10 });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projection_students'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'classroom_events'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'classroom_challenges'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'minigame_sessions'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'minigame_presets'").get()).toBeTruthy();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'prompt_decks'").get()).toBeTruthy();
    expect(db.prepare('SELECT id FROM schema_migrations ORDER BY rowid').all()).toEqual([
      { id: '0001_foundation' },
      { id: '0002_auth_projection' },
      { id: '0003_academic_roster' },
      { id: '0004_xp_specialties_levels_badges' },
      { id: '0005_coins_assessment_advantages' },
      { id: '0006_assessment_context_name_uniqueness' },
      { id: '0007_classroom_gameplay' },
      { id: '0008_game_master_content' },
      { id: '0009_event_create_idempotency' },
      { id: '0010_prompt_reveal' },
    ]);
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='xp_level_grant_transitions'").get() as {sql:string};
    expect(table.sql).toContain('UNIQUE (sequence)');
  });

  it('replays legacy rows through 0010 without losing content and accepts new states', () => {
    const db = database();
    db.pragma('foreign_keys = ON');
    migrateDatabase(db, migrations.slice(0, 7));
    const at = '2026-09-01T00:00:00.000Z';
    const ids = { teacher: '00000000-0000-4000-8000-000000000201', year: '00000000-0000-4000-8000-000000000202', group: '00000000-0000-4000-8000-000000000203', student: '00000000-0000-4000-8000-000000000204', challenge: '00000000-0000-4000-8000-000000000205', minigame: '00000000-0000-4000-8000-000000000206', promptDeck: '00000000-0000-4000-8000-000000000207' };
    db.prepare('INSERT INTO teacher_accounts (id,email,password_hash,created_at) VALUES (?,?,?,?)').run(ids.teacher, 'migration@example.test', 'hash', at);
    db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(ids.year, ids.teacher, 'Migration', '2026-09-01', '2027-07-01', at);
    db.prepare('INSERT INTO groups (id,owner_teacher_id,academic_year_id,name,created_at) VALUES (?,?,?,?,?)').run(ids.group, ids.teacher, ids.year, 'Migration group', at);
    db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(ids.student, ids.group, 'Migration student', 'Migration', 'default', at);
    db.prepare(`INSERT INTO classroom_challenges (id,owner_teacher_id,group_id,title,description,target,progress,status,show_on_projection,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(ids.challenge, ids.teacher, ids.group, 'Legacy challenge', 'Keep this row.', 3, 1, 'ACTIVE', 1, at, at);
    db.prepare(`INSERT INTO minigame_sessions (id,owner_teacher_id,group_id,kind,title,prompt,duration_seconds,status,remaining_seconds,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(ids.minigame, ids.teacher, ids.group, 'RANDOM_DRAW', 'Legacy draw', 'Legacy prompt', 0, 'ENDED', 0, at, at);

    expect(migrateDatabase(db, migrations.slice(0, 9))).toEqual({ applied: ['0008_game_master_content', '0009_event_create_idempotency'] });
    expect(db.prepare('SELECT id,status,progress,target FROM classroom_challenges WHERE id=?').get(ids.challenge)).toEqual({ id: ids.challenge, status: 'ACTIVE', progress: 1, target: 3 });
    expect(db.prepare('SELECT id,kind,team_count AS teamCount,team_assignments AS teamAssignments,prompt_deck_prompts AS promptDeckPrompts FROM minigame_sessions WHERE id=?').get(ids.minigame)).toEqual({ id: ids.minigame, kind: 'RANDOM_DRAW', teamCount: 0, teamAssignments: '{}', promptDeckPrompts: '[]' });
    db.prepare(`INSERT INTO minigame_sessions (id,owner_teacher_id,group_id,kind,title,prompt,duration_seconds,status,remaining_seconds,draw_index,created_at,updated_at,team_count,team_assignments,prompt_deck_prompts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ids.promptDeck, ids.teacher, ids.group, 'PROMPT_DECK', 'Legacy deck', 'Legacy prompt', 0, 'READY', 0, 0, at, at, 0, '{}', JSON.stringify(['Legacy prompt', 'Next prompt']));
    expect(migrateDatabase(db, migrations)).toEqual({ applied: ['0010_prompt_reveal'] });
    expect(db.prepare('SELECT id,kind,prompt,prompt_revealed AS promptRevealed FROM minigame_sessions WHERE id=?').get(ids.promptDeck)).toEqual({ id: ids.promptDeck, kind: 'PROMPT_DECK', prompt: 'Legacy prompt', promptRevealed: 1 });
    db.prepare(`INSERT INTO classroom_challenges (id,owner_teacher_id,group_id,title,description,target,status,show_on_projection,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run('00000000-0000-4000-8000-000000000208', ids.teacher, ids.group, 'Paused challenge', '', 2, 'PAUSED', 1, at, at);
    db.prepare(`INSERT INTO minigame_sessions (id,owner_teacher_id,group_id,kind,title,prompt,status,team_count,team_assignments,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run('00000000-0000-4000-8000-000000000209', ids.teacher, ids.group, 'TEAM_DRAW', 'Teams', '', 'ENDED', 2, '{}', at, at);
    expect(db.prepare("SELECT status FROM classroom_challenges WHERE status='PAUSED'").get()).toEqual({ status: 'PAUSED' });
    expect(db.prepare("SELECT kind FROM minigame_sessions WHERE kind='TEAM_DRAW'").get()).toEqual({ kind: 'TEAM_DRAW' });
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
