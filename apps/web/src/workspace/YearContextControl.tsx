import type { AcademicYear } from './workspace-api';
export function YearContextControl({ years, value, onChange, historical }: { years: AcademicYear[]; value: string; onChange: (id: string) => void; historical: boolean }) {
  return <label className="year-control">Year<select aria-label="Academic year" value={value} onChange={(event) => onChange(event.target.value)}>{years.map((year) => <option key={year.id} value={year.id}>{year.label}</option>)}</select>{historical && <span className="historical-badge">Historical · read-only</span>}</label>;
}
