'use client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, Input, Label, Modal, Select } from '@/components/ui';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { THAI_DAY_NAMES } from '@/lib/constants';

interface Holiday {
  id: string;
  date: string;
  name: string;
}

export default function HolidaysPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);

  const { data: holidays = [], isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays', year],
    queryFn: async () => (await fetch(`/api/holidays?year=${year}`)).json(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => fetch(`/api/holidays/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays', year] });
      toast.success('ลบแล้ว');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">วันหยุด</h1>
          <p className="text-sm text-slate-500 mt-1">วันหยุดราชการที่ใช้ในการจัดเวร</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32">
            {[year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            เพิ่มวันหยุด
          </Button>
        </div>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">วันที่</th>
              <th className="px-4 py-3 font-medium">วันในสัปดาห์</th>
              <th className="px-4 py-3 font-medium">ชื่อวันหยุด</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">กำลังโหลด…</td></tr>}
            {!isLoading && holidays.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">ยังไม่มีวันหยุดในปี {year + 543}</td></tr>
            )}
            {holidays.map((h) => {
              const d = new Date(h.date);
              return (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{h.date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{THAI_DAY_NAMES[d.getUTCDay()]}</td>
                  <td className="px-4 py-3">{h.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`ลบ ${h.name}?`)) remove.mutate(h.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {showAdd && (
        <AddHolidayModal year={year} onClose={() => setShowAdd(false)} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['holidays', year] });
          setShowAdd(false);
        }} />
      )}
    </div>
  );
}

function AddHolidayModal({ year, onClose, onSaved }: { year: number; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(`${year}-01-01`);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, name }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? 'เพิ่มไม่สำเร็จ');
      return;
    }
    toast.success('เพิ่มแล้ว');
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title="เพิ่มวันหยุด">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>วันที่</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label>ชื่อวันหยุด</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น วันสงกรานต์" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </form>
    </Modal>
  );
}
