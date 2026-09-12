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
      expect(migrateDatabase(db, migrations)).toEqual({ applied: [...migrations.map(migration => migration.id)] });
    expect(migrateDatabase(db, migrations)).toEqual({ applied: [] });
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_metadata'").get()).toBeTruthy();
     expect(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()).toEqual({ count: 13 });
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
       { id: '0011_academic_calendar_real_sessions' },
        { id: '0012_rt_absent_term_energy' },
        { id: '0013_gems' },
    ]);
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='xp_level_grant_transitions'").get() as {sql:string};
    expect(table.sql).toContain('UNIQUE (sequence)');
  });

  it('replays legacy rows through 0011 without losing content and accepts new states', () => {
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
     expect(migrateDatabase(db, migrations)).toEqual({ applied: ['0010_prompt_reveal', '0011_academic_calendar_real_sessions', '0012_rt_absent_term_energy', '0013_gems'] });
    expect(db.prepare('SELECT id,kind,prompt,prompt_revealed AS promptRevealed FROM minigame_sessions WHERE id=?').get(ids.promptDeck)).toEqual({ id: ids.promptDeck, kind: 'PROMPT_DECK', prompt: 'Legacy prompt', promptRevealed: 1 });
    db.prepare(`INSERT INTO classroom_challenges (id,owner_teacher_id,group_id,title,description,target,status,show_on_projection,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run('00000000-0000-4000-8000-000000000208', ids.teacher, ids.group, 'Paused challenge', '', 2, 'PAUSED', 1, at, at);
    db.prepare(`INSERT INTO minigame_sessions (id,owner_teacher_id,group_id,kind,title,prompt,status,team_count,team_assignments,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run('00000000-0000-4000-8000-000000000209', ids.teacher, ids.group, 'TEAM_DRAW', 'Teams', '', 'ENDED', 2, '{}', at, at);
    expect(db.prepare("SELECT status FROM classroom_challenges WHERE status='PAUSED'").get()).toEqual({ status: 'PAUSED' });
     expect(db.prepare("SELECT kind FROM minigame_sessions WHERE kind='TEAM_DRAW'").get()).toEqual({ kind: 'TEAM_DRAW' });
     expect(db.prepare('SELECT id,currency,cost FROM gem_reward_catalogue ORDER BY id').all()).toHaveLength(3);
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

  it('refuses 0013 when the SPEC-0005 XP transition index has drifted', () => {
    const db = database(); db.pragma('foreign_keys = ON'); migrateDatabase(db, migrations.slice(0, 12));
    db.exec('DROP INDEX uq_xp_grant_transition_source');
    expect(() => migrateDatabase(db, migrations)).toThrow(MigrationError);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'gem_%'").all()).toEqual([]);
    expect(db.prepare("SELECT id FROM schema_migrations WHERE id='0013_gems'").get()).toBeUndefined();
  });

  it('rolls every named 0013 stage back to the complete 0012 snapshot', () => {
    const stages = [
      'preflight',
      'table:gem_ledger', 'table:gem_reconciliation_cursors', 'table:gem_xp_transition_receipts',
      'table:gem_reconciliation_revisions', 'table:gem_reward_catalogue', 'table:gem_result_rewards',
      'table:gem_result_reward_operations', 'table:gem_advantage_redemptions', 'table:gem_spend_allocations',
      'index:idx_gem_ledger_student_year_currency_created', 'index:idx_gem_ledger_source',
      'index:idx_gem_ledger_family', 'index:idx_gem_result_rewards_student_year',
      'index:idx_gem_reconciliation_revisions_correlation', 'index:idx_gem_spend_allocations_movement',
      'index:uq_gem_spend_allocations_active_funding', 'catalogue-emerald', 'catalogue-ruby',
      'catalogue-diamond', 'xp-cursor-zero', 'postflight', 'migration-marker-before-commit',
    ] as const;
    for (const failingStage of stages) {
      const db = database();
      db.pragma('foreign_keys = ON');
      migrateDatabase(db, migrations.slice(0, 12));
      seedMigrationSnapshotRows(db);
      const before = migrationSnapshot(db);
      expect(() => migrateDatabase(db, migrations, { onStage: stage => { if (stage === failingStage) throw new Error(`injected ${stage}`); } })).toThrow(MigrationError);
      expect(migrationSnapshot(db)).toEqual(before);
      expect(db.prepare("SELECT 1 FROM sqlite_master WHERE name LIKE 'gem_%'").get()).toBeUndefined();
      expect(db.prepare("SELECT 1 FROM schema_migrations WHERE id='0013_gems'").get()).toBeUndefined();
    }
  });
});

function seedMigrationSnapshotRows(db: Database.Database) {
  const at = '2026-09-01T00:00:00.000Z';
  const teacher = '00000000-0000-4000-8000-000000000301';
  const year = '00000000-0000-4000-8000-000000000302';
  const group = '00000000-0000-4000-8000-000000000303';
  const student = '00000000-0000-4000-8000-000000000304';
  const context = '00000000-0000-4000-8000-000000000305';
  const ledger = '00000000-0000-4000-8000-000000000306';
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(teacher, 'snapshot@example.test', 'hash', at);
  db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(year, teacher, 'Snapshot', '2026-09-01', '2027-07-01', at);
  db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(group, teacher, year, 'Snapshot', at);
  db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,created_at) VALUES (?,?,?,?,?,?)').run(student, group, 'Private', 'S', 'default', at);
  db.prepare('INSERT INTO assessment_contexts VALUES (?,?,?,?,?)').run(context, group, 'Snapshot', null, at);
  db.prepare('INSERT INTO coin_ledger (id,student_id,academic_year_id,amount,source,created_at) VALUES (?,?,?,?,?,?)').run(ledger, student, year, 1, 'LEVEL_UP', at);
  db.prepare('INSERT INTO advantage_redemptions (id,student_id,assessment_context_id,reward_id,cost,debit_ledger_id,created_at,owner_teacher_id) VALUES (?,?,?,?,?,?,?,?)').run('00000000-0000-4000-8000-000000000307', student, context, 'standard-assessment-advantage', 2, ledger, at, teacher);
  db.prepare('INSERT INTO coin_spend_allocations (id,redemption_id,grant_ledger_entry_id,created_at) VALUES (?,?,?,?)').run('00000000-0000-4000-8000-000000000308', '00000000-0000-4000-8000-000000000307', ledger, at);
  db.prepare(`INSERT INTO xp_evidence_events (id,owner_teacher_id,student_id,academic_year_id,category,base_xp,specialty_at_award,specialty_category_at_award,bonus_eligible_at_award,specialty_bonus_xp,effective_xp,comment,created_at,created_by_teacher_id,client_request_id,request_fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run('00000000-0000-4000-8000-000000000309', teacher, student, year, 'PRECISION', 1, null, null, 0, 0, 1, null, at, teacher, 'snapshot', 'snapshot');
}

function migrationSnapshot(db: Database.Database) {
  const tables = ['xp_evidence_events', 'xp_evidence_reversals', 'xp_level_unlocks', 'xp_level_grant_transitions', 'coin_ledger', 'coin_rewards', 'advantage_redemptions', 'coin_spend_allocations'];
  return {
    schema: db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").all(),
    rows: Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()])),
  };
}
