export type AcademicYear = { id: string; label: string; startsOn: string; endsOn: string; archivedAt: string | null };
export type Group = { id: string; academicYearId: string; name: string };
export type TeacherStudent = { id: string; groupId: string; realName: string; alias: string; avatar: string; specialty: string | null; archivedAt: string | null };
export type ApiFailure = Error & { status?: number; code?: string };
export type XpCategory = 'COMMUNICATION'|'PRECISION'|'CONSISTENCY'|'COLLABORATION';
export type XpSummary = { studentId:string; academicYearId:string; annualEffectiveXp:number; level:1|2|3|4|5|6|7|8; progress:{current:number;required:number;nextLevel:number|null;isMaxLevel:boolean}; badges:Array<{category:XpCategory;label:string;unlockedAt:string}> };
export type CoinSummary = { studentId:string; academicYearId:string; balance:number };
export type ManualCoinSource = 'PERSONAL_IMPROVEMENT'|'EXCEPTIONAL_FRENCH'|'EXCEPTIONAL_COLLABORATION'|'SPECIAL_CHALLENGE';
export type CoinLedgerEntry = { id:string; amount:number; source:string; createdAt:string; correctionOfId:string|null };
export type ManualCoinGrantResponse = { id:string } & CoinSummary;
export type ManualCoinCorrectionResponse = { id:string; grantId:string; studentId:string; academicYearId:string; source:'MANUAL_CORRECTION'; amount:-1; replay:boolean };
export type CoinReward = { id:string; name:string; cost:2|3; type:'ASSESSMENT_ADVANTAGE' };
export type AdvantageRedemption = { id:string; studentId:string; assessmentContextId:string; rewardId:string; cost:2|3; createdAt:string; reversedAt:string|null };
export type AssessmentContext = { id:string; groupId:string; name:string; archivedAt:string|null };
export type XpEvidence = { id:string; category:XpCategory; baseXp:number; bonusXp:number; effectiveXp:number; reversedAt:string|null; createdAt:string };
export type XpEvidenceResponse = { items:XpEvidence[]; nextCursor:string|null };
export const activeAssessmentContexts = (contexts: AssessmentContext[]) => contexts.filter(context => !context.archivedAt);
export function mapXpEvidence(event: { id:string; category:XpCategory; baseXp:number; specialtyBonusXp:number; effectiveXp:number; createdAt:string; reversedAt:string|null }): XpEvidence { return { id:event.id, category:event.category, baseXp:event.baseXp, bonusXp:event.specialtyBonusXp, effectiveXp:event.effectiveXp, reversedAt:event.reversedAt, createdAt:event.createdAt }; }
export type ActivityState = { kind:'zero' } | { kind:'available'; items:XpEvidence[] } | { kind:'unavailable'; message:string };
export function activityState(response: XpEvidenceResponse|null): ActivityState { if (!response) return { kind:'unavailable', message:'Recent activity is unavailable. Retry.' }; return response.items.length ? { kind:'available', items:response.items.slice(0, 3) } : { kind:'zero' }; }
export function deriveClassSummary(students: TeacherStudent[], summaries: Record<string, XpSummary>) { return { students:students.length, activeEvidence:students.filter(student => (summaries[student.id]?.annualEffectiveXp ?? 0) > 0).length, badges:students.reduce((total, student) => total + (summaries[student.id]?.badges.length ?? 0), 0) }; }
export type ClassSummaryState = { kind:'available'; summary:ReturnType<typeof deriveClassSummary> } | { kind:'unavailable'; message:string };
export function classSummaryState(students: TeacherStudent[], summaries: Record<string, XpSummary>, available = true): ClassSummaryState { return available ? { kind:'available', summary:deriveClassSummary(students, summaries) } : { kind:'unavailable', message:'Class summary is unavailable. Retry.' }; }

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', signal });
  if (!response.ok) {
    let body: { code?: string; message?: string } = {};
    try { body = await response.json(); } catch { /* safe fallback */ }
    const error = new Error(response.status === 401 ? 'Sign-in required.' : body.message ?? 'Could not load classroom data.') as ApiFailure;
    error.status = response.status; error.code = body.code; throw error;
  }
  return response.json() as Promise<T>;
}
async function post<T>(url:string, body:unknown, key:string|undefined, signal?:AbortSignal):Promise<{value:T;replayed:boolean}> { const headers:Record<string,string>={'content-type':'application/json'}; if(key) headers['Idempotency-Key']=key; const response=await fetch(url,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body),signal}); if(!response.ok){let bodyValue:{message?:string;code?:string}={};try{bodyValue=await response.json();}catch{} const error=new Error(bodyValue.message??'Could not save classroom action.') as ApiFailure;error.status=response.status;error.code=bodyValue.code;throw error;} return {value:await response.json() as T,replayed:response.status===200}; }
const newKey=()=>crypto.randomUUID();

export const workspaceApi = {
  years: (includeArchived = false, signal?: AbortSignal) => get<AcademicYear[]>(`/api/v1/academic-years${includeArchived ? '?includeArchived=true' : ''}`, signal),
  createYear: (input: { label: string; startsOn: string; endsOn: string }, signal?: AbortSignal) => post<AcademicYear>('/api/v1/academic-years', input, undefined, signal),
  groups: (yearId: string, signal?: AbortSignal) => get<Group[]>(`/api/v1/academic-years/${yearId}/groups`, signal),
  createGroup: (yearId: string, name: string, signal?: AbortSignal) => post<Group>(`/api/v1/academic-years/${yearId}/groups`, { name }, undefined, signal),
  students: (groupId: string, archived: boolean, signal?: AbortSignal) => get<TeacherStudent[]>(`/api/v1/groups/${groupId}/students${archived ? '?includeArchived=true' : ''}`, signal),
  createStudents: (groupId: string, students: Array<{ realName: string; alias: string }>, signal?: AbortSignal) => post<TeacherStudent[]>(`/api/v1/groups/${groupId}/students`, { students }, undefined, signal),
  xpSummaries: (groupId:string, yearId:string, signal?:AbortSignal) => get<{groupId:string;academicYearId:string;summaries:Array<{studentId:string;summary:XpSummary}>}>(`/api/v1/groups/${groupId}/xp-summaries?academicYearId=${yearId}`,signal),
  xpEvidence: async (studentId:string, academicYearId:string, limit = 3, signal?:AbortSignal) => { const response = await get<{items:Array<{id:string;category:XpCategory;baseXp:number;specialtyBonusXp:number;effectiveXp:number;createdAt:string;reversedAt:string|null}>;nextCursor:string|null}>(`/api/v1/students/${studentId}/xp-evidence?academicYearId=${academicYearId}&limit=${limit}`, signal); return { items:response.items.map(mapXpEvidence), nextCursor:response.nextCursor }; },
  registerXp: (studentId:string, input:{category:XpCategory;baseXp:1|2|3;comment?:string}, signal?:AbortSignal, idempotencyKey?:string) => post<{event:{id:string;baseXp:number;specialtyBonusXp:number;effectiveXp:number};summary:XpSummary}>(`/api/v1/students/${studentId}/xp-evidence`,input,idempotencyKey ?? newKey(),signal),
  reverseXp: (eventId:string, signal?:AbortSignal) => post<{reversal:{targetEventId:string};summary:XpSummary}>(`/api/v1/xp-evidence/${eventId}/reversal`,{},newKey(),signal),
  coins: (studentId:string, signal?:AbortSignal) => get<CoinSummary>(`/api/v1/students/${studentId}/coins`,signal),
  coinRewards: (signal?:AbortSignal) => get<CoinReward[]>('/api/v1/coin-rewards',signal),
  coinLedger: (studentId:string, academicYearId:string, signal?:AbortSignal) => get<CoinLedgerEntry[]>(`/api/v1/students/${studentId}/coin-ledger?academicYearId=${academicYearId}`,signal),
  grantManualCoin: (studentId:string, academicYearId:string, source:ManualCoinSource, signal?:AbortSignal, idempotencyKey?:string) => post<ManualCoinGrantResponse>(`/api/v1/students/${studentId}/coin-grants`,{academicYearId,source},idempotencyKey ?? newKey(),signal),
  reverseManualCoin: (grantId:string, signal?:AbortSignal, idempotencyKey?:string) => post<ManualCoinCorrectionResponse>(`/api/v1/coin-grants/${grantId}/reversal`,{},idempotencyKey ?? newKey(),signal),
  assessmentContexts: (groupId:string, signal?:AbortSignal) => get<AssessmentContext[]>(`/api/v1/groups/${groupId}/assessment-contexts`,signal),
  createAssessmentContext: (groupId:string, name:string, signal?:AbortSignal) => post<AssessmentContext>('/api/v1/assessment-contexts',{groupId,name},undefined,signal),
  redeemAdvantage: (studentId:string, assessmentContextId:string, rewardId:string, signal?:AbortSignal, idempotencyKey?:string) => post<AdvantageRedemption>(`/api/v1/students/${studentId}/advantages`,{assessmentContextId,rewardId},idempotencyKey ?? newKey(),signal),
  reverseAdvantage: (redemptionId:string, signal?:AbortSignal) => post<unknown>(`/api/v1/advantage-redemptions/${redemptionId}/reversal`,{},newKey(),signal),
};
