import { useEffect, useRef } from 'react';
import type { TeacherStudent } from './workspace-api';
import type { WorkspaceStudentContext } from './workspace-state';
import { FastActionShell } from './FastActionShell';
import { UndoBanner } from './UndoBanner';

export function StudentPanel({ student, context, historical, feedback, undo, onClose, originRef, onUndoResult }: { student: TeacherStudent | null; context: WorkspaceStudentContext | null; historical: boolean; feedback: string; undo: any; onClose: () => void; originRef?: { current: HTMLElement | null }; onUndoResult: (message: string) => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousStudent = useRef<string | null>(null);
  const dialog = typeof window !== 'undefined' && window.innerWidth < 900;
  useEffect(() => { if (student && dialog && student.id !== previousStudent.current) (closeRef.current ?? headingRef.current)?.focus(); previousStudent.current = student?.id ?? null; }, [student, dialog]);
  if (!student || !context) return <aside className="student-panel panel-empty"><p className="muted">Select a student to inspect their classroom context.</p>{feedback && <p role="status" aria-live="polite">{feedback}</p>}</aside>;
  function close() { onClose(); window.requestAnimationFrame(() => originRef?.current?.focus()); }
  return <aside className="student-panel" role={dialog ? 'dialog' : undefined} aria-modal={dialog ? true : undefined} aria-labelledby="student-panel-title"><button ref={closeRef} className="panel-close" type="button" onClick={close} aria-label="Close student panel">×</button><div className="panel-identity"><span className="avatar" aria-hidden="true">{student.avatar === 'default' ? '◌' : '•'}</span><div><h2 ref={headingRef} id="student-panel-title" tabIndex={-1}>{student.realName}</h2><p className="muted">{student.alias}{student.specialty ? ` · ${student.specialty}` : ''}</p></div></div>{historical || student.archivedAt ? <p className="read-only-note" role="status">Historical record · read-only</p> : <FastActionShell context={context} state="empty" onResult={() => undefined} />}{feedback && <p role="status" aria-live="polite">{feedback}</p>}<UndoBanner opportunity={undo} onResult={onUndoResult} /></aside>;
}
