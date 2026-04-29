'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Select, Label } from '@/components/ui';
import { THAI_MONTH_NAMES, SHIFT_SYMBOLS } from '@/lib/constants';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

const SHIFT_TYPES = [
  'morning-SURG', 'morning-MED-DC', 'morning-MED-Cont', 'morning-ER',
  'afternoon-MED', 'afternoon-ER',
  'night',
  'dawn-OPD', 'dawn-ER',
  'ext_weekday', 'ext_holiday', 'smc',
] as const;

interface HistoryMember {
  id: string;
  nickname: string;
  phaId: string;
  isActive: boolean;
}

interface TimelineEntry {
  year: number;
  month: number;
  scheduleId: string;
  totalAssignments: number;
  perMember: Record<string, Record<string, number>>;
}

interface HistoryData {
  members: HistoryMember[];
  totals: Record<string, Record<string, number>>;
  timeline: TimelineEntry[];
  availableYears: number[];
}

export default function HistoryPage() {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const { data, isLoading } = useQuery<HistoryData>({
    queryKey: ['history', selectedYear],
    queryFn: async () => {
      const params = selectedYear !== 'all' ? `?year=${selectedYear}` : '';
      return (await fetch(`/api/history${params}`)).json();
    },
  });

  const members = data?.members ?? [];
  const totals = data?.totals ?? {};
  const timeline = data?.timeline ?? [];
  const availableYears = data?.availableYears ?? [];

  // Sort members: active first, then by nickname
  const sortedMembers = [...members].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.nickname.localeCompare(b.nickname, 'th');
  });

  function grandTotal(memberId: string) {
    return Object.values(totals[memberId] ?? {}).reduce((s, v) => s + v, 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">ประวัติตารางเวร</h1>
          <p className="text-sm text-slate-500 mt-1">
            สถิติจากตารางที่ยืนยันแล้วทั้งหมด ({timeline.length} เดือน)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="mb-0 text-slate-600">ปี</Label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">ทั้งหมด</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <Card className="p-8 text-center text-slate-400">กำลังโหลด…</Card>}

      {!isLoading && timeline.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-slate-500 text-sm">ยังไม่มีตารางที่ยืนยันแล้ว</p>
          <p className="text-slate-400 text-xs mt-1">
            เมื่อจัดตารางเสร็จและกด &quot;บันทึกยืนยัน&quot; จะปรากฏที่นี่
          </p>
        </Card>
      )}

      {!isLoading && timeline.length > 0 && (
        <>
          {/* ===== Cumulative stats table ===== */}
          <Card>
            <div className="px-5 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">สถิติสะสม</h2>
              <p className="text-xs text-slate-500 mt-0.5">จำนวนครั้งที่แต่ละคนทำเวรแต่ละประเภท (รวมทุกเดือนที่ยืนยัน)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[100px]">ชื่อ</th>
                    {SHIFT_TYPES.map((s) => (
                      <th key={s} className="px-2 py-2 font-medium text-slate-600 text-center whitespace-nowrap">
                        {SHIFT_SYMBOLS[s] ?? s}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-semibold text-slate-700 text-center bg-slate-100">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedMembers.map((m) => {
                    const mTotals = totals[m.id] ?? {};
                    const gt = grandTotal(m.id);
                    return (
                      <tr key={m.id} className={m.isActive ? 'hover:bg-slate-50' : 'opacity-50 hover:bg-slate-50'}>
                        <td className="px-4 py-2 font-medium sticky left-0 bg-white z-10">
                          <span className={m.isActive ? '' : 'text-slate-400'}>{m.nickname}</span>
                          {!m.isActive && <span className="ml-1 text-xs text-slate-400">(inactive)</span>}
                        </td>
                        {SHIFT_TYPES.map((s) => (
                          <td key={s} className="px-2 py-2 text-center">
                            {mTotals[s] ? (
                              <span className="inline-flex items-center justify-center min-w-[24px] h-6 rounded bg-blue-50 text-blue-700 font-medium px-1">
                                {mTotals[s]}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold bg-slate-50">
                          {gt > 0 ? gt : <span className="text-slate-300">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ===== Monthly timeline ===== */}
          <Card>
            <div className="px-5 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">รายละเอียดแต่ละเดือน</h2>
            </div>
            <ul className="divide-y">
              {timeline.map((entry) => {
                const key = `${entry.year}-${entry.month}`;
                const isOpen = expandedMonth === key;
                return (
                  <li key={key}>
                    {/* Row header */}
                    <div
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer select-none"
                      onClick={() => setExpandedMonth(isOpen ? null : key)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">
                          {THAI_MONTH_NAMES[entry.month - 1]} {entry.year + 543}
                        </span>
                        <Badge color="green">ยืนยันแล้ว</Badge>
                        <span className="text-xs text-slate-500">{entry.totalAssignments} เวร</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/schedules/${entry.year}/${entry.month}`}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ดูตาราง <ArrowRight className="w-3 h-3" />
                        </Link>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Expanded: mini stats table */}
                    {isOpen && (
                      <div className="px-5 pb-4 overflow-x-auto">
                        <table className="w-full text-xs min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="px-3 py-1.5 text-left font-medium text-slate-600 min-w-[90px]">ชื่อ</th>
                              {SHIFT_TYPES.map((s) => (
                                <th key={s} className="px-1.5 py-1.5 font-medium text-slate-500 text-center">{SHIFT_SYMBOLS[s] ?? s}</th>
                              ))}
                              <th className="px-2 py-1.5 font-semibold text-slate-600 text-center bg-slate-100">รวม</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedMembers
                              .filter((m) => entry.perMember[m.id])
                              .map((m) => {
                                const pm = entry.perMember[m.id] ?? {};
                                const tot = Object.values(pm).reduce((s, v) => s + v, 0);
                                return (
                                  <tr key={m.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-1.5 font-medium">{m.nickname}</td>
                                    {SHIFT_TYPES.map((s) => (
                                      <td key={s} className="px-1.5 py-1.5 text-center">
                                        {pm[s] ? (
                                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded bg-blue-50 text-blue-700 font-medium px-1">
                                            {pm[s]}
                                          </span>
                                        ) : (
                                          <span className="text-slate-200">—</span>
                                        )}
                                      </td>
                                    ))}
                                    <td className="px-2 py-1.5 text-center font-semibold bg-slate-50">{tot}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
