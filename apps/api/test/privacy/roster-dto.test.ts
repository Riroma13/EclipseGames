import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../../src/server.js';
import { toClassroomStudentIdentityDto, toTeacherStudentDto } from '../../src/roster/mapper.js';
import type { StudentRecord } from '../../src/roster/repository.js';

const credentials = { email: 'teacher@example.test', password: 'correct horse battery staple' };
const origin = 'http://localhost:5173';
const student: StudentRecord = {
  id: 'student-id',
  groupId: 'group-id',
  realName: 'Ada Lovelace',
  alias: 'Ada',
  avatar: 'default',
  specialty: 'Analyst',
  archivedAt: null,
  groupCorrectionLockedAt: '2026-01-02T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const apps: Awaited<ReturnType<typeof createServer>>[] = [];

afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
});

describe('roster DTO privacy boundary', () => {
  it('maps teacher-private data through an explicit allowlist', () => {
    expect(toTeacherStudentDto(student)).toEqual({
      id: 'student-id',
      groupId: 'group-id',
      realName: 'Ada Lovelace',
      alias: 'Ada',
      avatar: 'default',
      specialty: 'Analyst',
      archivedAt: null,
    });
    expect(toTeacherStudentDto(student)).not.toHaveProperty('groupCorrectionLockedAt');
    expect(toTeacherStudentDto(student)).not.toHaveProperty('createdAt');
  });

  it('maps classroom identity through a separate safe allowlist', () => {
    const value = toClassroomStudentIdentityDto(student);
    expect(value).toEqual({ id: 'student-id', alias: 'Ada', avatar: 'default', specialty: 'Analyst' });
    expect(value).not.toHaveProperty('realName');
    expect(value).not.toHaveProperty('groupId');
    expect(value).not.toHaveProperty('academicYearId');
    expect(value).not.toHaveProperty('archivedAt');
    expect(value).not.toHaveProperty('groupCorrectionLockedAt');
  });

  it('requires authentication and records rejection evidence without request payloads', async () => {
    const audit: Record<string, unknown>[] = [];
    const app = createServer(':memory:', { logger: false, audit: (entry) => audit.push(entry) });
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/groups/00000000-0000-4000-8000-000000000001/students',
      headers: { origin },
      payload: { students: [{ realName: 'Ada Lovelace', alias: 'Ada' }] },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'AUTH_REQUIRED', requestId: expect.any(String) });
    expect(JSON.stringify(audit)).not.toContain('Ada Lovelace');
    expect(JSON.stringify(audit)).not.toContain('Ada');
    expect(audit[0]).toEqual(expect.objectContaining({ code: 'AUTH_REQUIRED', requestId: expect.any(String) }));
  });

  it('never uses browser fields filtering or a private DTO fallback for projection', async () => {
    const app = createServer(':memory:', { logger: false, bootstrapTeacher: credentials });
    apps.push(app);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/session', headers: { origin }, payload: credentials });
    const cookie = login.headers['set-cookie'];
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projection/groups/00000000-0000-4000-8000-000000000001/students?fields=realName,groupId,archivedAt',
      headers: { origin, cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).not.toMatch(/realName|groupId|academicYearId|archivedAt|groupCorrectionLockedAt/);
  });
});
