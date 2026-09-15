import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildTermCloseWorkbook, safeFilename } from './xlsx.js';

describe('term-close XLSX export', () => {
  it('writes one canonical worksheet with deterministic numeric and blank cells', async () => {
    const input = {
      termCode: 'T1' as const,
      rows: [
        { studentId: 'b', realName: 'zoe', gradeMilli: 9875, rtSum: null, rtEvaluatedCount: 0 },
        { studentId: 'a', realName: 'Ada', gradeMilli: 2500, rtSum: 15, rtEvaluatedCount: 2 },
      ],
    };
    const first = await buildTermCloseWorkbook(input);
    const second = await buildTermCloseWorkbook(input);
    expect(first.equals(second)).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(first as any);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['T1']);
    const sheet = workbook.getWorksheet('T1')!;
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual(['Student', 'Classroom Observation /10', 'RT average /10']);
    expect((sheet.getRow(2).values as unknown[]).slice(1)).toEqual(['Ada', 2.5, 7.5]);
    expect((sheet.getRow(3).values as unknown[]).slice(1)).toEqual(['zoe', 9.875]);
    expect(sheet.getCell('C3').value).toBeNull();
    expect(sheet.getColumn(2).numFmt).toBe('0.###');
    expect(sheet.getColumn(3).numFmt).toBe('0.###');
  });

  it('creates a deterministic header-safe filename', () => {
    expect(safeFilename('2026', 'Group / One', 'T1', 3)).toBe('term-close_2026_Group-One_T1_v3.xlsx');
  });
});
