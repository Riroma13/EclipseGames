import ExcelJS from 'exceljs';

export type TermCloseExportRow = {
  studentId: string;
  realName: string;
  gradeMilli: number;
  rtSum: number | null;
  rtEvaluatedCount: number;
};

const headers = ['Student', 'Classroom Observation /10', 'RT average /10'] as const;

export async function buildTermCloseWorkbook(input: {
  termCode: 'T1' | 'T2' | 'T3';
  rows: readonly TermCloseExportRow[];
}): Promise<Buffer<ArrayBuffer>> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Eclipse Games';
  workbook.lastModifiedBy = 'Eclipse Games';
  workbook.created = new Date(0);
  workbook.modified = new Date(0);
  workbook.calcProperties.fullCalcOnLoad = false;
  (workbook.calcProperties as any).forceFullCalc = false;
  (workbook.calcProperties as any).calcMode = 'manual';
  const sheet = workbook.addWorksheet(input.termCode);
  sheet.addRow([...headers]);
  const rows = [...input.rows].sort((a, b) => a.realName.localeCompare(b.realName, undefined, { sensitivity: 'base' }) || a.studentId.localeCompare(b.studentId));
  for (const row of rows) {
    sheet.addRow([
      row.realName,
      row.gradeMilli / 1000,
      row.rtEvaluatedCount > 0 && row.rtSum !== null ? row.rtSum / row.rtEvaluatedCount : null,
    ]);
  }
  sheet.getColumn(2).numFmt = '0.###';
  sheet.getColumn(3).numFmt = '0.###';
  return Buffer.from(await workbook.xlsx.writeBuffer()) as unknown as Buffer<ArrayBuffer>;
}

export function safeFilename(yearLabel: string, groupName: string, termCode: string, version: number): string {
  const clean = (value: string, fallback: string) => {
    const normalized = value.normalize('NFKC').trim()
      .replace(/[\s]*[<>:"/\\|?*\u0000-\u001f]+[\s]*/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    return normalized || fallback;
  };
  return `term-close_${clean(yearLabel, 'year')}_${clean(groupName, 'group')}_${clean(termCode, 'term')}_v${version}.xlsx`;
}

export const xlsxContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
