import ExcelJS from 'exceljs';
import { SHIFT_SYMBOLS, SHIFT_COLORS, getShiftColor, THAI_DAY_NAMES, PREGNANCY_LABELS } from '@/lib/constants';
import { calculateAge, getAgeGroup } from '@/lib/scheduler/types';
import { toISODate } from '@/lib/scheduler/slots';

interface ExportInput {
  year: number;
  month: number;
  members: Array<{
    id: string;
    nickname: string;
    phaId: string;
    dateOfBirth: Date;
    pregnancyStatus: string | null;
  }>;
  assignments: Array<{
    memberId: string;
    date: Date;
    shiftType: string;
  }>;
  publicHolidayISODates: string[];
}

const SHIFT_ORDER = [
  'afternoon-MED', 'afternoon-ER', 'ext_weekday', 'ext_holiday',
  'smc', 'dawn-OPD', 'dawn-ER', 'night',
  'morning-SURG', 'morning-MED-DC', 'morning-MED-Cont', 'morning-ER',
] as const;

function toArgb(hex: string): string {
  const v = hex.replace('#', '');
  return 'FF' + v.toUpperCase();
}

export async function buildScheduleWorkbook(input: ExportInput): Promise<ExcelJS.Buffer> {
  const { year, month, members, assignments, publicHolidayISODates } = input;
  const holidaySet = new Set(publicHolidayISODates);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Pharmacy Shift Scheduler';
  wb.created = new Date();

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const refDate = new Date(Date.UTC(year, month - 1, 1));

  // ── Sheet 1: ตารางเวร ──
  const sheet1 = wb.addWorksheet('ตารางเวร');
  // Row 1: header
  const r1 = sheet1.getRow(1);
  r1.getCell(1).value = 'ชื่อเล่น';
  r1.getCell(2).value = 'รหัส';
  for (let d = 1; d <= daysInMonth; d++) r1.getCell(2 + d).value = d;
  r1.font = { bold: true };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };

  // Row 2: weekday names + color holidays red
  const r2 = sheet1.getRow(2);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    const dow = date.getUTCDay();
    const isHoliday = dow === 0 || dow === 6 || holidaySet.has(toISODate(date));
    const cell = r2.getCell(2 + d);
    cell.value = THAI_DAY_NAMES[dow];
    cell.alignment = { horizontal: 'center' };
    if (isHoliday) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(SHIFT_COLORS.holiday_header.hex) } };
      cell.font = { color: { argb: 'FFB71C1C' }, bold: true };
    }
  }

  // Build map: memberId → date(1..N) → symbols[]
  const cellMap = new Map<string, Map<number, string[]>>();
  for (const m of members) cellMap.set(m.id, new Map());
  for (const a of assignments) {
    const day = a.date.getUTCDate();
    const sym = SHIFT_SYMBOLS[a.shiftType] ?? a.shiftType;
    const inner = cellMap.get(a.memberId);
    if (!inner) continue;
    if (!inner.has(day)) inner.set(day, []);
    inner.get(day)!.push(sym);
  }

  // Rows 3+
  members.forEach((m, idx) => {
    const row = sheet1.getRow(3 + idx);
    row.getCell(1).value = m.nickname;
    row.getCell(2).value = m.phaId;
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = row.getCell(2 + d);
      const syms = cellMap.get(m.id)?.get(d) ?? [];
      if (syms.length === 0) continue;
      const text = syms.join('/');
      cell.value = text;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: toArgb(getShiftColor(text)) } };
    }
  });

  // Borders + column widths
  sheet1.getColumn(1).width = 14;
  sheet1.getColumn(2).width = 12;
  for (let d = 1; d <= daysInMonth; d++) sheet1.getColumn(2 + d).width = 6;
  const lastRow = 2 + members.length;
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= 2 + daysInMonth; c++) {
      sheet1.getRow(r).getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    }
  }
  sheet1.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];

  // ── Sheet 2: สรุป ──
  const sheet2 = wb.addWorksheet('สรุป');
  const headers = [
    'ชื่อเล่น', 'รหัส', 'อายุ', 'กลุ่มอายุ', 'สถานะตั้งครรภ์',
    ...SHIFT_ORDER.map((s) => SHIFT_SYMBOLS[s] ?? s),
    'รวม', 'เวรนักขัตฤกษ์', 'เวรเสาร์-อาทิตย์',
  ];
  const h = sheet2.getRow(1);
  headers.forEach((v, i) => {
    h.getCell(i + 1).value = v;
    h.getCell(i + 1).font = { bold: true };
    h.getCell(i + 1).alignment = { horizontal: 'center' };
  });

  const totals = new Array(SHIFT_ORDER.length + 3).fill(0);
  members.forEach((m, idx) => {
    const row = sheet2.getRow(2 + idx);
    const age = calculateAge(m.dateOfBirth, refDate);
    row.getCell(1).value = m.nickname;
    row.getCell(2).value = m.phaId;
    row.getCell(3).value = age;
    row.getCell(4).value = getAgeGroup(age);
    row.getCell(5).value = m.pregnancyStatus ? PREGNANCY_LABELS[m.pregnancyStatus] ?? m.pregnancyStatus : '-';

    const my = assignments.filter((a) => a.memberId === m.id);
    SHIFT_ORDER.forEach((st, i) => {
      const c = my.filter((a) => a.shiftType === st).length;
      row.getCell(6 + i).value = c;
      totals[i] += c;
    });
    const total = my.length;
    const holiday = my.filter((a) => holidaySet.has(toISODate(a.date))).length;
    const weekend = my.filter((a) => {
      const dow = a.date.getUTCDay();
      return dow === 0 || dow === 6;
    }).length;
    row.getCell(6 + SHIFT_ORDER.length).value = total;
    row.getCell(7 + SHIFT_ORDER.length).value = holiday;
    row.getCell(8 + SHIFT_ORDER.length).value = weekend;
    totals[SHIFT_ORDER.length] += total;
    totals[SHIFT_ORDER.length + 1] += holiday;
    totals[SHIFT_ORDER.length + 2] += weekend;
  });
  // Total row
  const tr = sheet2.getRow(2 + members.length);
  tr.getCell(1).value = 'รวม';
  tr.font = { bold: true };
  totals.forEach((v, i) => (tr.getCell(6 + i).value = v));

  sheet2.columns.forEach((c) => (c.width = 12));

  return wb.xlsx.writeBuffer();
}
