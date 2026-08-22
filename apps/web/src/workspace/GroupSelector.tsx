import type { Group } from './workspace-api';
export function GroupSelector({ groups, value, onChange }: { groups: Group[]; value: string; onChange: (id: string) => void }) {
  if (groups.length < 2) return null;
  return <label className="group-control">Group<select aria-label="Group" value={value} onChange={(event) => onChange(event.target.value)}>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>;
}
