'use client';
import { SHIFT_SYMBOLS } from '@/lib/constants';
import { Card } from '@/components/ui';
import type { GridAssignment, GridMember } from './ScheduleGrid';

const SHIFT_ORDER = [
  'afternoon-MED', 'afternoon-ER', 'ext_weekday', 'ext_holiday',
  'smc', 'dawn-OPD', 'dawn-ER', 'night',
  'morning-SURG', 'morning-MED-DC', 'morning-MED-Cont', 'morning-ER',
] as const;

interface Props {
  members: GridMember[];
  assignments: GridAssignment[];
  publicHolidayISODates: string[];
  notes?: string | null;
}

export function SummaryPanel({ members, assignments, publicHolidayISODates, notes }: Props) {
  const holidaySet = new Set(publicHolidayISODates);
  const counts = new Map<string, Record<string, number>>();
  for (const m of members) counts.set(m.id, {});
  for (const a of assignments) {
    const c = counts.get(a.memberId) ?? {};
    c[a.shiftType] = (c[a.shiftType] ?? 0) + 1;
    c.__total__ = (c.__total__ ?? 0) + 1;
    const date = new Date(a.date);
    const dow = date.getUTCDay();
    if (dow === 0 || dow === 6) c.__weekend__ = (c.__weekend__ ?? 0) + 1;
    if (holidaySet.has(date.toISOString().slice(0, 10))) c.__holiday__ = (c.__holiday__ ?? 0) + 1;
    counts.set(a.memberId, c);
  }

  return (
    <div className="space-y-4 w-80 shrink-0">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">สรุปจำนวนเวรแต่ละคน</h3>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left py-1 pr-2">ชื่อ</th>
                <th className="text-right py-1 px-1">รวม</th>
                <th className="text-right py-1 px-1">นักขัต</th>
                <th className="text-right py-1 px-1">ส-อา</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const c = counts.get(m.id) ?? {};
                return (
                  <tr key={m.id} className="border-t">
                    <td className="py-1 pr-2 font-medium">{m.nickname}</td>
                    <td className="py-1 px-1 text-right">{c.__total__ ?? 0}</td>
                    <td className="py-1 px-1 text-right">{c.__holiday__ ?? 0}</td>
                    <td className="py-1 px-1 text-right">{c.__weekend__ ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">รายละเอียดเวร</h3>
        <div className="overflow-auto max-h-96">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-1 pr-2">ชื่อ</th>
                {SHIFT_ORDER.map((s) => (
                  <th key={s} className="text-right py-1 px-1">{SHIFT_SYMBOLS[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const c = counts.get(m.id) ?? {};
                return (
                  <tr key={m.id} className="border-t">
                    <td className="py-1 pr-2 font-medium">{m.nickname}</td>
                    {SHIFT_ORDER.map((s) => (
                      <td key={s} className="text-right py-1 px-1">{c[s] || ''}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {notes && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">บันทึกระบบ</h3>
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap">{notes}</pre>
        </Card>
      )}
    </div>
  );
}
