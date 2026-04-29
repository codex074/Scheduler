'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, Input, Label, Modal, Select, Badge } from '@/components/ui';
import { PREGNANCY_LABELS } from '@/lib/constants';
import { calculateAge, getAgeGroup } from '@/lib/scheduler/types';
import { Trash2, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  nickname: string;
  phaId: string;
  dateOfBirth: string;
  pregnancyStatus: string | null;
  isActive: boolean;
}

export default function TeamPage() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await fetch('/api/members')).json(),
  });

  const [editing, setEditing] = useState<Member | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const refetch = () => qc.invalidateQueries({ queryKey: ['members'] });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => { refetch(); toast.success('ลบสมาชิกแล้ว'); },
  });

  const today = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ทีมงาน</h1>
          <p className="text-sm text-slate-500 mt-1">รายชื่อบุคลากรห้องยา</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" />
          เพิ่มสมาชิก
        </Button>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">ชื่อเล่น</th>
              <th className="px-4 py-3 font-medium">รหัส</th>
              <th className="px-4 py-3 font-medium">วันเกิด</th>
              <th className="px-4 py-3 font-medium">อายุ</th>
              <th className="px-4 py-3 font-medium">กลุ่ม</th>
              <th className="px-4 py-3 font-medium">สถานะตั้งครรภ์</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">กำลังโหลด…</td></tr>
            )}
            {!isLoading && members.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">ยังไม่มีสมาชิก กดปุ่ม &quot;เพิ่มสมาชิก&quot; เพื่อเริ่มต้น</td></tr>
            )}
            {members.map((m) => {
              const dob = new Date(m.dateOfBirth);
              const age = calculateAge(dob, today);
              const group = getAgeGroup(age);
              return (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{m.nickname}</td>
                  <td className="px-4 py-3 text-slate-600">{m.phaId}</td>
                  <td className="px-4 py-3 text-slate-600">{dob.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3">{age}</td>
                  <td className="px-4 py-3"><Badge color="blue">{group}</Badge></td>
                  <td className="px-4 py-3">
                    {m.pregnancyStatus ? (
                      <Badge color={m.pregnancyStatus === 'late' ? 'red' : m.pregnancyStatus === 'mid' ? 'yellow' : 'green'}>
                        {PREGNANCY_LABELS[m.pregnancyStatus] ?? m.pregnancyStatus}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`ลบ ${m.nickname}?`)) removeMutation.mutate(m.id);
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

      {(showAdd || editing) && (
        <MemberFormModal
          member={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { refetch(); setShowAdd(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function MemberFormModal({
  member,
  onClose,
  onSaved,
}: {
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [phaId, setPhaId] = useState(member?.phaId ?? '');
  const [dob, setDob] = useState(member ? member.dateOfBirth.slice(0, 10) : '');
  const [pregnancy, setPregnancy] = useState(member?.pregnancyStatus ?? '');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const url = member ? `/api/members/${member.id}` : '/api/members';
    const method = member ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname, phaId, dateOfBirth: dob, pregnancyStatus: pregnancy || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? 'บันทึกไม่สำเร็จ');
      return;
    }
    toast.success('บันทึกแล้ว');
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={member ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>ชื่อเล่น</Label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
        </div>
        <div>
          <Label>รหัส (pha_id)</Label>
          <Input value={phaId} onChange={(e) => setPhaId(e.target.value)} required />
        </div>
        <div>
          <Label>วันเกิด</Label>
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
        </div>
        <div>
          <Label>สถานะตั้งครรภ์</Label>
          <Select value={pregnancy ?? ''} onChange={(e) => setPregnancy(e.target.value)}>
            <option value="">— ไม่มี —</option>
            <option value="early">ตั้งครรภ์ระยะแรก</option>
            <option value="mid">ตั้งครรภ์ระยะกลาง</option>
            <option value="late">ตั้งครรภ์ระยะปลาย</option>
            <option value="postpartum">หลังคลอด</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </form>
    </Modal>
  );
}
