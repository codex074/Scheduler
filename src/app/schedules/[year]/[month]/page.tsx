'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, use } from 'react';
import { Button, Card, Modal, Badge, Select, Label } from '@/components/ui';
import { ScheduleGrid, getEligibleShiftsForCell, type GridAssignment, type GridMember } from '@/components/ScheduleGrid';
import { SummaryPanel } from '@/components/SummaryPanel';
import { THAI_MONTH_NAMES, SHIFT_SYMBOLS } from '@/lib/constants';
import { Sparkles, Download, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ShiftType } from '@/lib/scheduler/types';

interface PageProps {
  params: Promise<{ year: string; month: string }>;
}

export default function ScheduleDetailPage({ params }: PageProps) {
  const { year: y, month: m } = use(params);
  const year = Number(y);
  const month = Number(m);
  const qc = useQueryClient();

  const { data: members = [] } = useQuery<GridMember[]>({
    queryKey: ['members'],
    queryFn: async () => (await fetch('/api/members')).json(),
  });

  const { data: holidays = [] } = useQuery<{ id: string; date: string; name: string }[]>({
    queryKey: ['holidays', year],
    queryFn: async () => (await fetch(`/api/holidays?year=${year}`)).json(),
  });

  const { data: schedule, isLoading } = useQuery<{
    id: string; status: string; notes: string | null;
    assignments: Array<{ id: string; memberId: string; date: string; shiftType: ShiftType; member: GridMember }>;
  } | { error: string }>({
    queryKey: ['schedule', year, month],
    queryFn: async () => {
      const r = await fetch(`/api/schedules/${year}/${month}`);
      if (r.status === 404) return { error: 'ไม่พบตาราง' };
      return r.json();
    },
  });

  const exists = schedule && !('error' in schedule);
  const assignments: GridAssignment[] = exists ? schedule.assignments.map((a) => ({
    id: a.id, memberId: a.memberId, date: a.date, shiftType: a.shiftType,
  })) : [];

  const publicHolidayISODates = useMemo(() => holidays.map((h) => h.date.slice(0, 10)), [holidays]);

  const [selectedCell, setSelectedCell] = useState<{ memberId: string; day: number; current: GridAssignment[] } | null>(null);
  const [generating, setGenerating] = useState(false);

  const generate = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const r = await fetch(`/api/schedules/${year}/${month}/generate`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'จัดตารางไม่สำเร็จ');
      return j;
    },
    onSuccess: (j) => {
      qc.invalidateQueries({ queryKey: ['schedule', year, month] });
      qc.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(`จัดตารางสำเร็จ — ${j.summary.assigned} เวร, คะแนน ${j.summary.score}`);
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setGenerating(false),
  });

  const finalize = useMutation({
    mutationFn: async () =>
      fetch(`/api/schedules/${year}/${month}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalized' }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', year, month] });
      toast.success('ปิดตารางแล้ว');
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => fetch(`/api/schedules/${year}/${month}/assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', year, month] });
      setSelectedCell(null);
    },
  });

  const addAssignment = useMutation({
    mutationFn: async (input: { memberId: string; date: string; shiftType: ShiftType }) => {
      const r = await fetch(`/api/schedules/${year}/${month}/assignments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'เพิ่มไม่สำเร็จ');
      return j;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule', year, month] });
      setSelectedCell(null);
      toast.success('เพิ่มเวรแล้ว');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCellClick(memberId: string, day: number, current: GridAssignment[]) {
    if (exists && schedule.status === 'finalized') {
      toast.info('ตารางถูกปิดแล้ว — ปลดล็อกเพื่อแก้ไข');
      return;
    }
    setSelectedCell({ memberId, day, current });
  }

  const selectedMember = selectedCell ? members.find((m) => m.id === selectedCell.memberId) : null;
  const selectedDate = selectedCell
    ? new Date(Date.UTC(year, month - 1, selectedCell.day))
    : null;
  const isSelectedHoliday = selectedDate
    ? selectedDate.getUTCDay() === 0 || selectedDate.getUTCDay() === 6 ||
      publicHolidayISODates.includes(selectedDate.toISOString().slice(0, 10))
    : false;
  const eligibleShifts = selectedMember && selectedDate
    ? getEligibleShiftsForCell(selectedMember, selectedDate, isSelectedHoliday)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            ตารางเวร {THAI_MONTH_NAMES[month - 1]} {year + 543}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            {exists ? (
              <Badge color={schedule.status === 'finalized' ? 'green' : 'yellow'}>
                {schedule.status === 'finalized' ? 'ปิดตารางแล้ว' : 'ฉบับร่าง'}
              </Badge>
            ) : (
              <Badge color="gray">ยังไม่ได้สร้าง</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={exists ? 'secondary' : 'primary'}
            onClick={() => generate.mutate()}
            disabled={generating || members.length === 0}
          >
            {exists ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'กำลังจัด…' : exists ? 'Generate ใหม่' : 'Generate ตาราง'}
          </Button>
          {exists && (
            <>
              <a href={`/api/schedules/${year}/${month}/export`}>
                <Button variant="secondary"><Download className="w-4 h-4" />Export Excel</Button>
              </a>
              {schedule.status !== 'finalized' && (
                <Button variant="secondary" onClick={() => finalize.mutate()}>
                  <Lock className="w-4 h-4" />ปิดตาราง
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {members.length === 0 && (
        <Card className="p-8 text-center text-slate-500">
          ยังไม่มีสมาชิกในระบบ — กรุณาเพิ่มทีมก่อนที่หน้า <a className="text-blue-600 underline" href="/team">ทีมงาน</a>
        </Card>
      )}

      {isLoading && <Card className="p-8 text-center text-slate-400">กำลังโหลด…</Card>}

      {members.length > 0 && (
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <ScheduleGrid
              year={year}
              month={month}
              members={members}
              assignments={assignments}
              publicHolidayISODates={publicHolidayISODates}
              onCellClick={handleCellClick}
            />
          </div>
          <SummaryPanel
            members={members}
            assignments={assignments}
            publicHolidayISODates={publicHolidayISODates}
            notes={exists ? schedule.notes : null}
          />
        </div>
      )}

      {selectedCell && selectedMember && selectedDate && (
        <Modal
          open
          onClose={() => setSelectedCell(null)}
          title={`${selectedMember.nickname} • วันที่ ${selectedCell.day}`}
        >
          <div className="space-y-4">
            {selectedCell.current.length > 0 && (
              <div>
                <Label>เวรปัจจุบัน</Label>
                <div className="space-y-2">
                  {selectedCell.current.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded border px-3 py-2">
                      <span className="font-medium">{SHIFT_SYMBOLS[a.shiftType]} ({a.shiftType})</span>
                      <Button size="sm" variant="ghost" onClick={() => deleteAssignment.mutate(a.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>เพิ่มเวรใหม่ (เฉพาะที่กฎอนุญาต)</Label>
              {eligibleShifts.length === 0 ? (
                <p className="text-sm text-slate-500">ไม่มีเวรที่บุคคลนี้สามารถทำได้ในวันนี้</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {eligibleShifts.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="secondary"
                      onClick={() => addAssignment.mutate({
                        memberId: selectedMember.id,
                        date: selectedDate.toISOString().slice(0, 10),
                        shiftType: s,
                      })}
                    >
                      {SHIFT_SYMBOLS[s]} — {s}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
