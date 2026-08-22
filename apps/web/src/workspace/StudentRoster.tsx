import type { TeacherStudent } from './workspace-api';
import { StudentCard } from './StudentCard';
export function StudentRoster({ students, selectedId, onSelect, query }: { students: TeacherStudent[]; selectedId: string | null; onSelect: (id: string) => void; query: string }) {
  if (!students.length) return <p className="empty-state" role="status">{query ? 'No matching students.' : 'No students in this group.'}</p>;
  return <div className="roster-grid" aria-label="Student roster">{students.map((student) => <StudentCard key={student.id} student={student} selected={student.id === selectedId} onSelect={() => onSelect(student.id)} />)}</div>;
}
