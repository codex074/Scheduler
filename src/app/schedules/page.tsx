'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Button, Card, Modal, Select, Label, Badge } from '@/components/ui';
import { THAI_MONTH_NAMES } from '@/lib/constants';
import { Plus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ScheduleRow {
  id: string;
  year: number;
  month: number;
  status: string;
  _count: { assignments: number };
}

export default function SchedulesPage() {
  const { data: schedules = [], isLoading } = useQuery<ScheduleRow[]>({
    queryKey: ['schedules'],
    queryFn: async () => (await fetch('/api/schedules')).json(),
  });
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ตารางเวร</h1>
          <p className="text-sm text-slate-500 mt-1">ตารางเวรทั้งหมด เรียงจากใหม่ไปเก่า</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          สร้างตารางเดือนใหม่
        </Button>
      </div>

      <Card>
        {isLoading && <div className="px-4 py-8 text-center text-slate-400">กำลังโหลด…</div>}
        {!isLoading && schedules.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400">ยังไม่มีตาราง</div>
        )}
        <ul className="divide-y">
          {schedules.map((s) => (
            <li key={s.id}>
              <Link href={`/schedules/${s.year}/${s.month}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                <div>
                  <div className="font-medium">{THAI_MONTH_NAMES[s.month - 1]} {s.year + 543}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s._count.assignments} เวร</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={s.status === 'finalized' ? 'green' : 'yellow'}>
                    {s.status === 'finalized' ? 'ปิดตารางแล้ว' : 'ฉบับร่าง'}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  return (
    <Modal open onClose={onClose} title="สร้างตารางเดือนใหม่">
      <div className="space-y-4">
        <div>
          <Label>ปี</Label>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>เดือน</Label>
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {THAI_MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => router.push(`/schedules/${year}/${month}`)}>ไปหน้าตาราง</Button>
        </div>
      </div>
    </Modal>
  );
}
