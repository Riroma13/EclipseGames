import BetterSqlite3 from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { migrations, type Migration } from './migrations.js';

export type MigrationStage =
  | 'preflight'
  | `table:${string}`
  | `index:${string}`
  | 'catalogue-emerald'
  | 'catalogue-ruby'
  | 'catalogue-diamond'
  | 'xp-cursor-zero'
  | 'postflight'
  | 'migration-marker-before-commit';

export type MigrationTestOptions = { onStage?: (stage: MigrationStage) => void };

export class MigrationError extends Error {
  constructor(public readonly migrationId: string, cause: unknown) {
    super(`Migration ${migrationId} failed; startup is blocked.`, { cause });
    this.name = 'MigrationError';
  }
}

export function migrateDatabase(
  db: Database.Database,
  pendingMigrations: Migration[] = migrations,
  testOptions: MigrationTestOptions = {},
) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY NOT NULL, applied_at TEXT NOT NULL);`);
  const applied = new Set((db.prepare('SELECT id FROM schema_migrations ORDER BY id').all() as { id: string }[]).map(row => row.id));
  const appliedNow: string[] = [];

  for (const migration of pendingMigrations) {
    if (applied.has(migration.id)) continue;
    try {
      db.transaction(() => {
        if (migration.id === '0013_gems') {
          stage(testOptions, 'preflight');
          assertGemPreflight(db, applied);
          executeGemSql(db, migration.sql, testOptions);
          stage(testOptions, 'postflight');
          assertGemPostflight(db);
          stage(testOptions, 'migration-marker-before-commit');
        } else if (migration.id === '0014_behaviour_lives') {
          assertBehaviourPreflight(db, applied);
          db.exec(migration.sql);
        } else if (migration.id === '0017_avatar_core') {
          assertAvatarPreflight(db, applied);
          db.exec(migration.sql);
          assertAvatarPostflight(db);
        } else if (migration.id === '0018_m9_boutique') {
          stage(testOptions, 'preflight');
          assertBoutiquePreflight(db, applied);
          executeBoutiqueSql(db, migration.sql, testOptions);
          stage(testOptions, 'postflight');
          assertBoutiquePostflight(db);
          stage(testOptions, 'migration-marker-before-commit');
        } else {
          db.exec(migration.sql);
        }
        db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)').run(migration.id, new Date().toISOString());
      })();
      appliedNow.push(migration.id);
      applied.add(migration.id);
    } catch (cause) {
      throw new MigrationError(migration.id, cause);
    }
  }
  return { applied: appliedNow };
}

function assertBehaviourPreflight(db: Database.Database, applied: Set<string>) {
  if (!applied.has('0013_gems') || [...applied].some(id => Number(id.slice(0, 4)) > 14)) {
    throw new Error('0014_behaviour_lives requires the 0013 migration baseline.');
  }
  if (db.prepare("SELECT 1 FROM schema_migrations WHERE id='0014_behaviour_lives'").get()) {
    throw new Error('0014_behaviour_lives marker already exists.');
  }
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE name IN ('behaviour_student_state','behaviour_actions','behaviour_incidents','behaviour_proposals','behaviour_requests','real_class_session_behaviour_roster')").get()) {
    throw new Error('Behaviour schema already exists without migration marker.');
  }
  if (db.prepare("SELECT 1 FROM real_class_sessions WHERE ended_at IS NULL").get()) {
    throw new Error('0014_behaviour_lives cannot migrate while a class session is active.');
  }
  const columns = db.prepare('PRAGMA table_info(real_class_sessions)').all() as { name: string }[];
  if (columns.some(column => column.name === 'behaviour_snapshot_version')) {
    throw new Error('0014_behaviour_lives detected schema drift.');
  }
}

function assertAvatarPreflight(db: Database.Database, applied: Set<string>) {
  const expected = migrations.slice(0, 16).map(migration => migration.id);
  if (expected.some(id => !applied.has(id)) || [...applied].some(id => !expected.includes(id))) throw new Error('0017_avatar_core requires exactly the 0016 migration baseline.');
  if (db.prepare("SELECT 1 FROM schema_migrations WHERE id='0017_avatar_core'").get()) throw new Error('0017_avatar_core marker already exists.');
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE name IN ('avatar_profiles','avatar_profile_versions','avatar_profile_requests')").get()) throw new Error('Avatar schema already exists without migration marker.');
  if (db.prepare("SELECT 1 FROM students WHERE avatar NOT IN ('default','fox','owl','cat','wolf')").get()) throw new Error('0017_avatar_core found an unknown legacy avatar token.');
  if (db.prepare('SELECT 1 FROM students s JOIN groups g ON g.id=s.group_id JOIN academic_years y ON y.id=g.academic_year_id WHERE g.owner_teacher_id <> y.owner_teacher_id').get()) throw new Error('0017_avatar_core found invalid student owner lineage.');
  if (db.prepare('SELECT 1 FROM students s LEFT JOIN groups g ON g.id=s.group_id LEFT JOIN academic_years y ON y.id=g.academic_year_id WHERE g.id IS NULL OR y.id IS NULL OR y.owner_teacher_id IS NULL').get()) throw new Error('0017_avatar_core found missing student owner lineage.');
}

function assertAvatarPostflight(db: Database.Database) {
  const students = (db.prepare('SELECT COUNT(*) AS count FROM students').get() as { count: number }).count;
  const profiles = (db.prepare('SELECT COUNT(*) AS count FROM avatar_profiles').get() as { count: number }).count;
  const versions = (db.prepare('SELECT COUNT(*) AS count FROM avatar_profile_versions').get() as { count: number }).count;
  if (students !== profiles || students !== versions) throw new Error('0017_avatar_core did not create exactly one profile and revision per student.');
  if (db.prepare("SELECT 1 FROM avatar_profiles p LEFT JOIN avatar_profile_versions v ON v.profile_student_id=p.student_id AND v.revision=p.current_revision WHERE v.profile_student_id IS NULL").get()) throw new Error('0017_avatar_core created an invalid profile head.');
}

function assertBoutiquePreflight(db: Database.Database, applied: Set<string>) {
  const expected = migrations.slice(0, 17).map(migration => migration.id);
  if (expected.some(id => !applied.has(id)) || [...applied].some(id => !expected.includes(id))) throw new Error('0018_m9_boutique requires exactly the 0017 migration baseline.');
  if (db.prepare("SELECT 1 FROM schema_migrations WHERE id='0018_m9_boutique'").get()) throw new Error('0018_m9_boutique marker already exists.');
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE name IN ('boutique_purchases','boutique_purchase_requests','boutique_spend_allocations')").get()) throw new Error('Boutique schema already exists without migration marker.');
  assertIntegrity(db);
  if (db.prepare("SELECT 1 FROM avatar_profile_versions WHERE face_id NOT IN ('face-human','face-fox','face-owl','face-cat','face-wolf') OR skin_tone_id NOT IN ('skin-light','skin-medium-light','skin-medium','skin-medium-dark','skin-dark') OR hair_id NOT IN ('hair-none','hair-short','hair-curly','hair-long') OR feature_id NOT IN ('feature-none','feature-glasses','feature-freckles') OR clothing_id NOT IN ('clothing-eclipse','clothing-field') OR accessory_id NOT IN ('accessory-none','accessory-pin') OR frame_id NOT IN ('frame-none','frame-orbit') OR background_id NOT IN ('background-eclipse','background-night')").get()) throw new Error('0018_m9_boutique found an unknown avatar profile value.');
  if (db.prepare('SELECT 1 FROM avatar_profiles p LEFT JOIN avatar_profile_versions v ON v.profile_student_id=p.student_id AND v.revision=p.current_revision WHERE v.profile_student_id IS NULL').get()) throw new Error('0018_m9_boutique found an invalid profile head.');
}

function executeBoutiqueSql(db: Database.Database, sql: string, options: MigrationTestOptions) {
  for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
    db.exec(statement);
    const table = /^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([\w]+)/i.exec(statement)?.[1];
    if (table) stage(options, `table:${table}`);
    const index = /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+([\w]+)/i.exec(statement)?.[1];
    if (index) stage(options, `index:${index}`);
  }
}

function assertBoutiquePostflight(db: Database.Database) {
  assertIntegrity(db);
  const versions = (db.prepare('SELECT COUNT(*) AS count FROM avatar_profile_versions').get() as { count: number }).count;
  const profiles = (db.prepare('SELECT COUNT(*) AS count FROM avatar_profiles').get() as { count: number }).count;
  if (versions !== profiles) throw new Error('0018_m9_boutique changed avatar profile counts.');
  if (db.prepare('SELECT 1 FROM avatar_profiles p LEFT JOIN avatar_profile_versions v ON v.profile_student_id=p.student_id AND v.revision=p.current_revision WHERE v.profile_student_id IS NULL').get()) throw new Error('0018_m9_boutique created an invalid profile head.');
  for (const table of ['boutique_purchases', 'boutique_purchase_requests', 'boutique_spend_allocations']) {
    if ((db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count !== 0) throw new Error(`0018_m9_boutique seeded ${table}.`);
  }
  if ((db.prepare("SELECT COUNT(*) AS count FROM gem_ledger WHERE movement_kind='SPEND'").get() as { count: number }).count !== 0) throw new Error('0018_m9_boutique seeded Gem spends.');
}

function stage(options: MigrationTestOptions, name: MigrationStage) { options.onStage?.(name); }

function executeGemSql(db: Database.Database, sql: string, options: MigrationTestOptions) {
  for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
    db.exec(statement);
    const table = /^CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([\w]+)/i.exec(statement)?.[1];
    if (table) stage(options, `table:${table}`);
    const index = /^CREATE\s+(?:UNIQUE\s+)?INDEX\s+([\w]+)/i.exec(statement)?.[1];
    if (index) stage(options, `index:${index}`);
    const catalogue = /INSERT INTO gem_reward_catalogue[\s(]/i.test(statement);
    if (catalogue) for (const currency of ['emerald', 'ruby', 'diamond'] as const) stage(options, `catalogue-${currency}`);
    if (/INSERT INTO gem_reconciliation_cursors[\s(]/i.test(statement)) stage(options, 'xp-cursor-zero');
  }
}

function assertGemPreflight(db: Database.Database, applied: Set<string>) {
  const expected = migrations.slice(0, 12).map(migration => migration.id);
  if (expected.some(id => !applied.has(id)) || [...applied].some(id => !expected.includes(id))) throw new Error('0013_gems requires exactly the 0012 migration baseline.');
  if (db.prepare("SELECT 1 FROM schema_migrations WHERE id='0013_gems'").get()) throw new Error('0013_gems marker already exists.');
  if (db.prepare("SELECT 1 FROM sqlite_master WHERE name LIKE 'gem_%'").get()) throw new Error('Gem schema already exists without migration marker.');
  assertIntegrity(db);
  assertXpContract(db, true);
  assertXpData(db);
}

function assertGemPostflight(db: Database.Database) {
  assertIntegrity(db);
  assertXpContract(db, true);
  assertXpData(db);
  const expected = schemaSnapshot(db, name => name.startsWith('gem_') || name.startsWith('idx_gem_') || name.startsWith('uq_gem_'));
  const reference = new BetterSqlite3(':memory:');
  reference.pragma('foreign_keys = ON');
  reference.exec(migrations.slice(0, 12).map(migration => migration.sql).join('\n'));
  reference.exec(migrations[12].sql);
  const actual = JSON.stringify(expected);
  const declared = JSON.stringify(schemaSnapshot(reference, name => name.startsWith('gem_') || name.startsWith('idx_gem_') || name.startsWith('uq_gem_')));
  reference.close();
  if (actual !== declared) throw new Error('0013 gem schema metadata drifted from its declaration.');
  const catalogue = db.prepare('SELECT id,currency,cost FROM gem_reward_catalogue ORDER BY id').all();
  if (JSON.stringify(catalogue) !== JSON.stringify([
    { id: 'diamond-assessment-advantage', currency: 'DIAMOND', cost: 1 },
    { id: 'emerald-assessment-advantage', currency: 'EMERALD', cost: 2 },
    { id: 'ruby-assessment-advantage', currency: 'RUBY', cost: 1 },
  ])) throw new Error('0013 gem catalogue is not exact.');
  if ((db.prepare('SELECT COUNT(*) AS count FROM gem_ledger').get() as { count: number }).count !== 0) throw new Error('0013 gem ledger is not empty.');
  for (const table of ['gem_xp_transition_receipts', 'gem_reconciliation_revisions', 'gem_result_rewards', 'gem_result_reward_operations', 'gem_advantage_redemptions', 'gem_spend_allocations']) {
    if ((db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count !== 0) throw new Error(`0013 ${table} is not empty.`);
  }
  const cursor = db.prepare('SELECT stream,last_sequence,updated_at FROM gem_reconciliation_cursors').get();
  if (!cursor || (cursor as { stream: string; last_sequence: number }).stream !== 'xp-level-grant-transitions' || (cursor as { last_sequence: number }).last_sequence !== 0 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test((cursor as { updated_at: string }).updated_at)) throw new Error('0013 XP cursor is invalid.');
}

function assertIntegrity(db: Database.Database) {
  if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('SQLite integrity check failed.');
  if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign-key check failed.');
}

function assertXpContract(db: Database.Database, _effective0012: boolean) {
  const reference = new BetterSqlite3(':memory:');
  reference.pragma('foreign_keys = ON');
  reference.exec(migrations.slice(0, 12).map(migration => migration.sql).join('\n'));
  const include = (name: string) => name.startsWith('xp_') || name.startsWith('idx_xp_') || name.startsWith('uq_xp_');
  const matches = JSON.stringify(schemaSnapshot(db, include)) === JSON.stringify(schemaSnapshot(reference, include));
  reference.close();
  if (!matches) throw new Error('0012-effective XP schema metadata drifted.');
}

function assertXpData(db: Database.Database) {
  const ids = ['xp_evidence_events', 'xp_evidence_reversals', 'xp_level_unlocks', 'xp_level_grant_transitions'];
  for (const table of ids) {
    const duplicate = db.prepare(`SELECT id FROM ${table} GROUP BY id HAVING COUNT(*) > 1 LIMIT 1`).get();
    if (duplicate) throw new Error(`Duplicate XP id in ${table}.`);
  }
  const count = (db.prepare('SELECT COUNT(*) AS count FROM xp_level_grant_transitions').get() as { count: number }).count;
  const sequenceCount = (db.prepare('SELECT COUNT(*) AS count FROM xp_level_grant_transitions WHERE sequence BETWEEN 1 AND ?').get(count) as { count: number }).count;
  if (count && sequenceCount !== count) throw new Error('XP transition sequences are not contiguous.');
  const unlocks = db.prepare('SELECT id,student_id,academic_year_id,level,first_source_event_id FROM xp_level_unlocks').all() as { id:string; student_id:string; academic_year_id:string; level:number; first_source_event_id:string }[];
  for (const unlock of unlocks) {
    if (unlock.level < 2 || unlock.level > 8) throw new Error('XP unlock level is outside L2-L8.');
    const event = db.prepare('SELECT student_id,academic_year_id FROM xp_evidence_events WHERE id=?').get(unlock.first_source_event_id) as { student_id:string; academic_year_id:string } | undefined;
    if (!event || event.student_id !== unlock.student_id || event.academic_year_id !== unlock.academic_year_id) throw new Error('XP unlock source lineage is invalid.');
  }
  const transitions = db.prepare('SELECT unlock_id,kind,source_event_id,source_reversal_id FROM xp_level_grant_transitions').all() as { unlock_id:string; kind:string; source_event_id:string|null; source_reversal_id:string|null }[];
  for (const transition of transitions) {
    const unlock = unlocks.find(row => row.id === transition.unlock_id);
    if (!unlock || (transition.kind === 'REVOKE' ? transition.source_event_id !== null || !transition.source_reversal_id : !transition.source_event_id || transition.source_reversal_id !== null)) throw new Error('XP transition lineage is invalid.');
    const source = transition.source_event_id ? db.prepare('SELECT student_id,academic_year_id FROM xp_evidence_events WHERE id=?').get(transition.source_event_id) : db.prepare('SELECT e.student_id,e.academic_year_id FROM xp_evidence_reversals r JOIN xp_evidence_events e ON e.id=r.target_event_id WHERE r.id=?').get(transition.source_reversal_id!);
    if (!source || (source as { student_id:string }).student_id !== unlock.student_id || (source as { academic_year_id:string }).academic_year_id !== unlock.academic_year_id) throw new Error('XP transition source scope is invalid.');
  }
}

type SchemaSnapshot = Record<string, unknown>;
function schemaSnapshot(db: Database.Database, include: (name: string) => boolean): SchemaSnapshot {
  const objects = (db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all() as {type:string;name:string;tbl_name:string;sql:string|null}[]).filter(row => include(row.name));
  return Object.fromEntries(objects.map(row => [row.name, {
    type: row.type, tbl_name: row.tbl_name, sql: normalizeSql(row.sql),
    xinfo: row.type === 'table' ? db.prepare(`PRAGMA table_xinfo("${row.name}")`).all() : undefined,
    foreignKeys: row.type === 'table' ? db.prepare(`PRAGMA foreign_key_list("${row.name}")`).all() : undefined,
    indexes: row.type === 'table' ? (db.prepare(`PRAGMA index_list("${row.name}")`).all() as { name:string }[]).map(index => ({ ...index, info: db.prepare(`PRAGMA index_xinfo("${index.name}")`).all() })) : undefined,
  }]));
}
function normalizeSql(sql: string | null) { return sql?.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase() ?? null; }
