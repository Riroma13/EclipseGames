import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { migrateDatabase } from '../db/migrate.js';
import { migrations } from '../db/migrations.js';
import * as service from './service.js';
import { createLevelGrantTransitionPort } from './level-grant-transition-port.js';

it('exposes ordered immutable transitions for SPEC-0005 replay', () => {
  const db=new Database(':memory:'); db.pragma('foreign_keys=ON'); migrateDatabase(db,migrations);
  const t='00000000-0000-4000-8000-000000000101', y='00000000-0000-4000-8000-000000000102', g='00000000-0000-4000-8000-000000000103', s='00000000-0000-4000-8000-000000000104';
  db.prepare('INSERT INTO teacher_accounts VALUES (?,?,?,?)').run(t,'t@test','h','now'); db.prepare('INSERT INTO academic_years (id,owner_teacher_id,label,starts_on,ends_on,created_at) VALUES (?,?,?,?,?,?)').run(y,t,'Y','2026','2027','now'); db.prepare('INSERT INTO groups VALUES (?,?,?,?,?)').run(g,t,y,'G','now'); db.prepare('INSERT INTO students (id,group_id,real_name,alias,avatar,specialty,created_at) VALUES (?,?,?,?,?,?,?)').run(s,g,'Student','S','default','Leader','now');
  service.create(db,t,s,{category:'COMMUNICATION',baseXp:3},'00000000-0000-4000-8000-000000000105'); service.create(db,t,s,{category:'COMMUNICATION',baseXp:3},'00000000-0000-4000-8000-000000000106'); service.create(db,t,s,{category:'COMMUNICATION',baseXp:3},'00000000-0000-4000-8000-000000000107');
  const port=createLevelGrantTransitionPort(db); const transitions=port.listAfter(0,10); expect(transitions).toHaveLength(1); expect(transitions[0]).toMatchObject({sequence:1,kind:'GRANT',level:2}); expect(port.get(transitions[0].id)).toEqual(transitions[0]); db.close();
});
