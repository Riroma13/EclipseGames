export type AcademicYear = { id: string; label: string; startsOn: string; endsOn: string; archivedAt: string | null };
export type Group = { id: string; academicYearId: string; name: string };
export type TeacherStudent = { id: string; groupId: string; realName: string; alias: string; avatar: string; specialty: string | null; archivedAt: string | null };
export type ApiFailure = Error & { status?: number; code?: string };

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

export const workspaceApi = {
  years: (includeArchived = false, signal?: AbortSignal) => get<AcademicYear[]>(`/api/v1/academic-years${includeArchived ? '?includeArchived=true' : ''}`, signal),
  groups: (yearId: string, signal?: AbortSignal) => get<Group[]>(`/api/v1/academic-years/${yearId}/groups`, signal),
  students: (groupId: string, archived: boolean, signal?: AbortSignal) => get<TeacherStudent[]>(`/api/v1/groups/${groupId}/students${archived ? '?includeArchived=true' : ''}`, signal),
};
