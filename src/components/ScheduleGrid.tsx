'use client';
import { useMemo, useState } from 'react';
import { SHIFT_SYMBOLS, THAI_DAY_NAMES, getShiftColor, SHIFT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { calculateAge, getAgeGroup, type ShiftType } from '@/lib/scheduler/types';
import { getAllowedShifts } from '@/lib/scheduler/eligibility';

export interface GridMember {
  id: string;
  nickname: string;
  phaId: string;
  dateOfBirth: string;
  pregnancyStatus: string | null;
  isActive?: boolean;
}

export interface GridAssignment {
  id: string;
  memberId: string;
  date: string; // ISO
  shiftType: ShiftType;
}

interface Props {
  year: number;
  month: number;
  members: GridMember[];
  assignments: GridAssignment[];
  publicHolidayISODates: string[];
  onCellClick?: (memberId: string, day: number, current: GridAssignment[]) => void;
  highlightedCells?: Set<string>; // "memberId__day"
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function ScheduleGrid({
  year, month, members, assignments, publicHolidayISODates,
  onCellClick, highlightedCells,
}: Props) {
  const days = daysInMonth(year, month);
  const refDate = useMemo(() => new Date(Date.UTC(year, month - 1, 1)), [year, month]);
  const holidaySet = useMemo(() => new Set(publicHolidayISODates), [publicHolidayISODates]);

  // memberId+day → assignments[]
  const cellMap = useMemo(() => {
    const m = new Map<string, GridAssignment[]>();
    for (const a of assignments) {
      const day = new Date(a.date).getUTCDate();
      const k = `${a.memberId}__${day}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [assignments]);

  return (
    <div className="overflow-auto border border-slate-200 rounded-lg bg-white">
      <table className="text-xs border-collapse">
        <thead className="sticky top-0 z-20 bg-slate-50">
          <tr>
            <th className="sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-left min-w-[120px]">ชื่อเล่น</th>
            <th className="sticky left-[120px] z-30 bg-slate-50 border-b border-r border-slate-200 px-2 py-2 text-left min-w-[80px]">รหัส</th>
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
              const date = new Date(Date.UTC(year, month - 1, d));
              const dow = date.getUTCDay();
              const isWknd = dow === 0 || dow === 6;
              const isHoliday = holidaySet.has(date.toISOString().slice(0, 10));
              return (
                <th
                  key={d}
                  className={cn(
                    'border-b border-r border-slate-200 px-1 py-1 text-center min-w-[34px] font-medium',
                    (isWknd || isHoliday) && 'bg-red-50 text-red-700',
                  )}
                >
                  {d}
                </th>
              );
            })}
          </tr>
          <tr>
            <th className="sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200"></th>
            <th className="sticky left-[120px] z-30 bg-slate-50 border-b border-r border-slate-200"></th>
            {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
              const date = new Date(Date.UTC(year, month - 1, d));
              const dow = date.getUTCDay();
              const isWknd = dow === 0 || dow === 6;
              const isHoliday = holidaySet.has(date.toISOString().slice(0, 10));
              return (
                <th
                  key={d}
                  className={cn(
                    'border-b border-r border-slate-200 px-1 py-1 text-center font-normal text-[10px]',
                    (isWknd || isHoliday) && 'bg-red-50 text-red-600',
                  )}
                  style={isHoliday && !isWknd ? { background: SHIFT_COLORS.holiday_header.hex } : undefined}
                >
                  {THAI_DAY_NAMES[dow]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const dob = new Date(m.dateOfBirth);
            const age = calculateAge(dob, refDate);
            const grp = getAgeGroup(age);
            return (
              <tr key={m.id} className="hover:bg-slate-50/40">
                <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-2 py-1.5 text-left">
                  <div className="font-medium">{m.nickname}</div>
                  <div className="text-[10px] text-slate-400">อายุ {age} • {grp}</div>
                </td>
                <td className="sticky left-[120px] z-10 bg-white border-b border-r border-slate-200 px-2 py-1.5 text-slate-600">{m.phaId}</td>
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
                  const k = `${m.id}__${d}`;
                  const cellAsgs = cellMap.get(k) ?? [];
                  const symbols = cellAsgs.map((a) => SHIFT_SYMBOLS[a.shiftType] ?? a.shiftType).join('/');
                  const bg = symbols ? getShiftColor(symbols) : undefined;
                  const isHighlight = highlightedCells?.has(k);
                  return (
                    <td
                      key={d}
                      onClick={() => onCellClick?.(m.id, d, cellAsgs)}
                      className={cn(
                        'border-b border-r border-slate-200 text-center cursor-pointer hover:ring-2 hover:ring-blue-400',
                        isHighlight && 'ring-2 ring-red-500',
                      )}
                      style={{ background: bg, height: 30, minWidth: 34, padding: '2px 4px' }}
                      title={cellAsgs.map((a) => a.shiftType).join(', ') || 'ว่าง — คลิกเพื่อเพิ่ม'}
                    >
                      <span className="text-[11px] font-medium leading-none">{symbols}</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {members.length === 0 && (
            <tr><td colSpan={2 + days} className="px-4 py-6 text-center text-slate-400">ยังไม่มีสมาชิกในระบบ</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function getEligibleShiftsForCell(
  member: GridMember,
  date: Date,
  isHoliday: boolean,
): ShiftType[] {
  const allowed = getAllowedShifts(
    {
      id: member.id,
      nickname: member.nickname,
      phaId: member.phaId,
      dateOfBirth: new Date(member.dateOfBirth),
      pregnancyStatus: (member.pregnancyStatus ?? null) as never,
      allowedShifts: null,
    },
    date,
  );
  const dow = date.getUTCDay();
  const valid: ShiftType[] = [];
  if (isHoliday) {
    for (const s of ['morning-SURG', 'morning-MED-DC', 'morning-MED-Cont', 'morning-ER',
      'afternoon-MED', 'afternoon-ER', 'ext_holiday', 'night'] as ShiftType[]) {
      if (allowed.has(s)) valid.push(s);
    }
  } else {
    const candidates: ShiftType[] = ['afternoon-MED', 'afternoon-ER', 'ext_weekday', 'dawn-OPD', 'night'];
    if (dow >= 1 && dow <= 4) candidates.push('smc');
    if (dow >= 2 && dow <= 5) candidates.push('dawn-ER');
    for (const s of candidates) if (allowed.has(s)) valid.push(s);
  }
  return valid;
}
