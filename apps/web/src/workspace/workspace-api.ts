export type AcademicYear = { id: string; label: string; startsOn: string; endsOn: string; archivedAt: string | null };
export type Group = { id: string; academicYearId: string; name: string };
export type TeacherStudent = { id: string; groupId: string; realName: string; alias: string; avatar: string; specialty: string | null; archivedAt: string | null };
export type ApiFailure = Error & { status?: number; code?: string };
export type XpCategory = 'COMMUNICATION'|'PRECISION'|'CONSISTENCY'|'COLLABORATION';
export type XpSummary = { studentId:string; academicYearId:string; annualEffectiveXp:number; level:1|2|3|4|5|6|7|8; progress:{current:number;required:number;nextLevel:number|null;isMaxLevel:boolean}; badges:Array<{category:XpCategory;label:string;unlockedAt:string}> };
export type CoinSummary = { studentId:string; academicYearId:string; balance:number };
export type CoinReward = { id:string; name:string; cost:2|3; type:'ASSESSMENT_ADVANTAGE' };
export type AdvantageRedemption = { id:string; studentId:string; assessmentContextId:string; rewardId:string; cost:2|3; createdAt:string; reversedAt:string|null };
export type AssessmentContext = { id:string; groupId:string; name:string; archivedAt:string|null };
export const activeAssessmentContexts = (contexts: AssessmentContext[]) => contexts.filter(context => !context.archivedAt);

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
  groups: (yearId: string, signal?: AbortSignal) => get<Group[]>(`/api/v1/academic-years/${yearId}/groups`, signal),
  students: (groupId: string, archived: boolean, signal?: AbortSignal) => get<TeacherStudent[]>(`/api/v1/groups/${groupId}/students${archived ? '?includeArchived=true' : ''}`, signal),
  xpSummaries: (groupId:string, yearId:string, signal?:AbortSignal) => get<{groupId:string;academicYearId:string;summaries:Array<{studentId:string;summary:XpSummary}>}>(`/api/v1/groups/${groupId}/xp-summaries?academicYearId=${yearId}`,signal),
  registerXp: (studentId:string, input:{category:XpCategory;baseXp:1|2|3;comment?:string}, signal?:AbortSignal, idempotencyKey?:string) => post<{event:{id:string;baseXp:number;specialtyBonusXp:number;effectiveXp:number};summary:XpSummary}>(`/api/v1/students/${studentId}/xp-evidence`,input,idempotencyKey ?? newKey(),signal),
  reverseXp: (eventId:string, signal?:AbortSignal) => post<{reversal:{targetEventId:string};summary:XpSummary}>(`/api/v1/xp-evidence/${eventId}/reversal`,{},newKey(),signal),
  coins: (studentId:string, signal?:AbortSignal) => get<CoinSummary>(`/api/v1/students/${studentId}/coins`,signal),
  coinRewards: (signal?:AbortSignal) => get<CoinReward[]>('/api/v1/coin-rewards',signal),
  assessmentContexts: (groupId:string, signal?:AbortSignal) => get<AssessmentContext[]>(`/api/v1/groups/${groupId}/assessment-contexts`,signal),
  createAssessmentContext: (groupId:string, name:string, signal?:AbortSignal) => post<AssessmentContext>('/api/v1/assessment-contexts',{groupId,name},undefined,signal),
  redeemAdvantage: (studentId:string, assessmentContextId:string, rewardId:string, signal?:AbortSignal, idempotencyKey?:string) => post<AdvantageRedemption>(`/api/v1/students/${studentId}/advantages`,{assessmentContextId,rewardId},idempotencyKey ?? newKey(),signal),
  reverseAdvantage: (redemptionId:string, signal?:AbortSignal) => post<unknown>(`/api/v1/advantage-redemptions/${redemptionId}/reversal`,{},newKey(),signal),
};
