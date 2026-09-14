import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from '../server.js';

describe('observation rubric private API', () => {
  const apps: Array<Awaited<ReturnType<typeof createServer>>> = [];
  afterEach(async () => { for (const app of apps.splice(0)) await app.close(); });

  it('returns virtual zero-evidence views, enforces revisions, and keeps ownership private', async () => {
    const app=createServer(':memory:',{logger:false,bootstrapTeacher:{email:'rubric@example.test',password:'correct horse battery staple'}}); apps.push(app);
    const missing=await app.inject({method:'GET',url:`/api/v1/students/${randomUUID()}/terms/${randomUUID()}/observation-rubric?academicYearId=${randomUUID()}`});
    expect(missing.statusCode).toBe(401);
    const login=await app.inject({method:'POST',url:'/api/v1/auth/session',payload:{email:'rubric@example.test',password:'correct horse battery staple'}}); const headers={cookie:String(login.headers['set-cookie']).split(';')[0]};
    const year=await app.inject({method:'POST',url:'/api/v1/academic-years',headers,payload:{label:'Rubric year',startsOn:'2026-01-01',endsOn:'2026-12-31'}}); const yearId=year.json().id;
    const group=await app.inject({method:'POST',url:`/api/v1/academic-years/${yearId}/groups`,headers,payload:{name:'Rubric group'}}); const groupId=group.json().id;
    const student=await app.inject({method:'POST',url:`/api/v1/groups/${groupId}/students`,headers,payload:{students:[{realName:'Private name',alias:'Private alias'}]}}); const studentId=student.json()[0].id;
    await app.inject({method:'PUT',url:`/api/v1/academic-years/${yearId}/calendar`,headers,payload:{timezone:'UTC',terms:[{code:'T1',startsOn:'2026-01-01',endsOn:'2026-04-30'},{code:'T2',startsOn:'2026-05-01',endsOn:'2026-08-31'},{code:'T3',startsOn:'2026-09-01',endsOn:'2026-12-31'}],holidays:[],slots:[]}});
    const calendar=await app.inject({method:'GET',url:`/api/v1/academic-years/${yearId}/calendar`,headers}); const termId=calendar.json().terms[0].id;
    const base=`/api/v1/students/${studentId}/terms/${termId}/observation-rubric`; const url=`${base}?academicYearId=${yearId}`;
    const initial=await app.inject({method:'GET',url,headers}); expect(initial.statusCode).toBe(200); expect(initial.json()).toMatchObject({state:'OPEN',revision:0}); expect(initial.json().categories[0]).toMatchObject({baseXp:0,qualifyingEventCount:0,lowEvidence:true}); expect(initial.body).not.toContain('Private name');
    const key=randomUUID(); const saved=await app.inject({method:'PUT',url,headers:{...headers,'idempotency-key':key},payload:{expectedRevision:0,overrides:{COMMUNICATION:4,PRECISION:null,CONSISTENCY:null,COLLABORATION:null},comment:'Private comment'}});
    expect(saved.statusCode).toBe(200); const replay=await app.inject({method:'PUT',url,headers:{...headers,'idempotency-key':key},payload:{expectedRevision:0,overrides:{COMMUNICATION:4,PRECISION:null,CONSISTENCY:null,COLLABORATION:null},comment:'Private comment'}}); expect(replay.statusCode).toBe(200);
    const closeKey=randomUUID(); const closePayload={expectedRevision:1};
    const closed=await app.inject({method:'POST',url:`${base}/close?academicYearId=${yearId}`,headers:{...headers,'idempotency-key':closeKey},payload:closePayload});
    expect(closed.statusCode).toBe(201); expect(closed.json()).toMatchObject({state:'CLOSED',revision:2,snapshot:{version:1,gradeDecimal:'4.375'}});
    const closeReplay=await app.inject({method:'POST',url:`${base}/close?academicYearId=${yearId}`,headers:{...headers,'idempotency-key':closeKey},payload:closePayload});
    expect(closeReplay.statusCode).toBe(200); expect(closeReplay.json()).toEqual(closed.json());
    const closeMismatch=await app.inject({method:'POST',url:`${base}/close?academicYearId=${yearId}`,headers:{...headers,'idempotency-key':closeKey},payload:{expectedRevision:99}});
    expect(closeMismatch.statusCode).toBe(409);
    const reopenKey=randomUUID(); const reopenPayload={expectedRevision:2,reason:'Correction requested'};
    const reopened=await app.inject({method:'POST',url:`${base}/reopen?academicYearId=${yearId}`,headers:{...headers,'idempotency-key':reopenKey},payload:reopenPayload});
    expect(reopened.statusCode).toBe(201); expect(reopened.json()).toMatchObject({state:'REOPENED',revision:3,snapshot:{version:1}});
    const reopenReplay=await app.inject({method:'POST',url:`${base}/reopen?academicYearId=${yearId}`,headers:{...headers,'idempotency-key':reopenKey},payload:reopenPayload});
    expect(reopenReplay.statusCode).toBe(200); expect(reopenReplay.json()).toEqual(reopened.json());
    const reopenMismatch=await app.inject({method:'POST',url:`${base}/reopen?academicYearId=${yearId}`,headers:{...headers,'idempotency-key':reopenKey},payload:{expectedRevision:3,reason:'Different meaning'}});
    expect(reopenMismatch.statusCode).toBe(409);
    const stale=await app.inject({method:'PUT',url,headers:{...headers,'idempotency-key':randomUUID()},payload:{expectedRevision:1,overrides:{COMMUNICATION:null,PRECISION:null,CONSISTENCY:null,COLLABORATION:null},comment:null}}); expect(stale.statusCode).toBe(409);
    const groupView=await app.inject({method:'GET',url:`/api/v1/groups/${groupId}/terms/${termId}/observation-rubrics?academicYearId=${yearId}`,headers}); expect(groupView.statusCode).toBe(200); expect(groupView.json().students).toHaveLength(1);
  });
});
