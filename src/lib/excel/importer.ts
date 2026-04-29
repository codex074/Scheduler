import ExcelJS from 'exceljs';
import { SHIFT_SYMBOLS } from '@/lib/constants';
import type { ShiftType } from '@/lib/scheduler/types';

// Case-insensitive reverse map: symbol.toLowerCase() → ShiftType[]
const SYMBOL_TO_SHIFTS = new Map<string, ShiftType[]>();
for (const [shiftType, symbol] of Object.entries(SHIFT_SYMBOLS)) {
  const key = symbol.toLowerCase();
  if (!SYMBOL_TO_SHIFTS.has(key)) SYMBOL_TO_SHIFTS.set(key, []);
  SYMBOL_TO_SHIFTS.get(key)!.push(shiftType as ShiftType);
}

export interface ImportedAssignment {
  nickname: string;
  phaId: string;
  day: number;
  shiftType: ShiftType;
}

export interface ImportResult {
  assignments: ImportedAssignment[];
  warnings: string[];
  memberKeys: Array<{ nickname: string; phaId: string }>;
}

function normalizeSymbol(raw: string): string {
  // Keep Thai characters as-is (บM, รO etc.), lowercase ASCII only
  return raw.replace(/[a-zA-Z]+/g, (m) => m.toLowerCase());
}

/**
 * Flexible parser for Sheet "ตารางเวร" (or first sheet).
 * Handles both the app's export format (ชื่อเล่น/รหัส) and the legacy
 * format (NickName/pha_id) as seen in the screenshot.
 * Symbol matching is case-insensitive for ASCII letters (S→s, D→d, etc.)
 */
export async function parseScheduleWorkbook(
  buf: Buffer | ArrayBuffer,
  year: number,
  month: number,
  publicHolidayISODates: string[],
): Promise<ImportResult> {
  const holidaySet = new Set(publicHolidayISODates);
  const wb = new ExcelJS.Workbook();
  // ExcelJS load() accepts ArrayBuffer; convert Node Buffer → plain ArrayBuffer
  const ab: ArrayBuffer = buf instanceof Buffer
    ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
    : buf as ArrayBuffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(ab as any);

  // Prefer sheet named "ตารางเวร", fall back to first sheet
  const sheet = wb.getWorksheet('ตารางเวร') ?? wb.worksheets[0];
  if (!sheet) throw new Error('ไม่พบ Sheet ใดในไฟล์');

  const warnings: string[] = [];
  const assignments: ImportedAssignment[] = [];
  const memberKeys: Array<{ nickname: string; phaId: string }> = [];

  // ── Step 1: find the header row ──
  // Look for a row where col-1 matches a nickname label and col-3+ contains numbers 1..31
  let headerRowNum = -1;
  let nicknameCol = 1;
  let phaIdCol = 2;
  const colToDay = new Map<number, number>(); // col number → day (1-31)

  const NICKNAME_LABELS = new Set(['nickname', 'ชื่อเล่น', 'ชื่อ', 'name', 'นิคเนม']);
  const PHAID_LABELS = new Set(['pha_id', 'phaid', 'รหัส', 'id', 'phaId']);

  sheet.eachRow({ includeEmpty: false }, (row, rn) => {
    if (headerRowNum !== -1) return; // already found
    const c1 = String(row.getCell(1).value ?? '').trim().toLowerCase();
    const c2 = String(row.getCell(2).value ?? '').trim().toLowerCase();

    if (!NICKNAME_LABELS.has(c1) && !PHAID_LABELS.has(c1)) return;

    // Determine column order (some old files may swap cols)
    if (PHAID_LABELS.has(c2)) {
      nicknameCol = 1;
      phaIdCol = 2;
    } else {
      nicknameCol = 1;
      phaIdCol = 2; // default
    }

    // Scan remaining cols for day numbers
    const tmpMap = new Map<number, number>();
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (colNum <= 2) return;
      const v = Number(cell.value);
      if (!isNaN(v) && v >= 1 && v <= 31) tmpMap.set(colNum, v);
    });

    if (tmpMap.size >= 20) { // expect at least 20 days
      headerRowNum = rn;
      tmpMap.forEach((day, col) => colToDay.set(col, day));
    }
  });

  // Fallback: if no label row found, try row 1 directly (app export format without text label)
  if (headerRowNum === -1) {
    const row1 = sheet.getRow(1);
    row1.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (colNum <= 2) return;
      const v = Number(cell.value);
      if (!isNaN(v) && v >= 1 && v <= 31) colToDay.set(colNum, v);
    });
    if (colToDay.size >= 20) {
      headerRowNum = 1;
      nicknameCol = 1;
      phaIdCol = 2;
    } else {
      throw new Error('ไม่พบแถว header ที่มีเลขวันที่ — ตรวจสอบ format ไฟล์');
    }
  }

  const dataStartRow = headerRowNum + 1;

  // ── Step 2: parse member rows ──
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < dataStartRow) return;

    const nickname = String(row.getCell(nicknameCol).value ?? '').trim();
    const phaIdRaw = row.getCell(phaIdCol).value;
    const phaId = phaIdRaw !== null && phaIdRaw !== undefined
      ? String(phaIdRaw).trim()
      : '';

    if (!nickname) return;
    // Skip if nickname looks like a summary row
    if (nickname === 'รวม' || nickname === 'Total' || nickname === 'total') return;

    memberKeys.push({ nickname, phaId });

    colToDay.forEach((day, col) => {
      const rawVal = row.getCell(col).value;
      if (rawVal === null || rawVal === undefined) return;
      const cellText = String(rawVal).trim();
      if (!cellText) return;

      // Split on "/" or "/"
      const parts = cellText.split(/[/／]/).map((s) => s.trim()).filter(Boolean);

      for (const part of parts) {
        const normalized = normalizeSymbol(part);
        const candidates = SYMBOL_TO_SHIFTS.get(normalized);

        if (!candidates || candidates.length === 0) {
          warnings.push(`${nickname} วันที่ ${day}: ไม่รู้จักสัญลักษณ์ "${part}" — ข้าม`);
          continue;
        }

        let shiftType: ShiftType;
        if (candidates.length === 1) {
          shiftType = candidates[0];
        } else {
          // Disambiguate "ext" → ext_holiday vs ext_weekday
          const date = new Date(Date.UTC(year, month - 1, day));
          const dow = date.getUTCDay();
          const isoDate = date.toISOString().slice(0, 10);
          const isHoliday = dow === 0 || dow === 6 || holidaySet.has(isoDate);
          shiftType = isHoliday
            ? (candidates.find((c) => c === 'ext_holiday') ?? candidates[0])
            : (candidates.find((c) => c === 'ext_weekday') ?? candidates[0]);
        }

        assignments.push({ nickname, phaId, day, shiftType });
      }
    });
  });

  if (memberKeys.length === 0) {
    throw new Error('ไม่พบแถวข้อมูลสมาชิก — ตรวจสอบ format ไฟล์');
  }

  return { assignments, warnings, memberKeys };
}
