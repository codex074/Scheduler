'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Button, Card, Input, Label, Modal, Select, Badge } from '@/components/ui';
import { PREGNANCY_LABELS } from '@/lib/constants';
import { calculateAge, getAgeGroup, type ShiftType } from '@/lib/scheduler/types';
import { Trash2, Pencil, Plus, ToggleLeft, ToggleRight, Upload, FileJson, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  nickname: string;
  phaId: string;
  dateOfBirth: string;
  pregnancyStatus: string | null;
  isActive: boolean;
  allowedShifts: string | null; // JSON string in DB
}

const SHIFT_OPTIONS: { key: ShiftType; label: string; group: string }[] = [
  { key: 'morning-SURG',     label: 'เช้า-ผ่าตัด (s)',     group: 'เช้า (วันหยุด)' },
  { key: 'morning-MED-DC',   label: 'เช้า-อายุรกรรม DC (d)', group: 'เช้า (วันหยุด)' },
  { key: 'morning-MED-Cont', label: 'เช้า-อายุรกรรม Cont (c)', group: 'เช้า (วันหยุด)' },
  { key: 'morning-ER',       label: 'เช้า-ฉุกเฉิน (e)',    group: 'เช้า (วันหยุด)' },
  { key: 'afternoon-MED',    label: 'บ่าย-อายุรกรรม (บM)', group: 'บ่าย' },
  { key: 'afternoon-ER',     label: 'บ่าย-ฉุกเฉิน (บE)',  group: 'บ่าย' },
  { key: 'night',            label: 'ดึก (ด)',             group: 'ดึก' },
  { key: 'dawn-OPD',         label: 'รุ่งเช้า-OPD (รO)',  group: 'รุ่งเช้า (จ–ศ)' },
  { key: 'dawn-ER',          label: 'รุ่งเช้า-ER (รE)',   group: 'รุ่งเช้า (จ–ศ)' },
  { key: 'ext_weekday',      label: 'ต่อบ่าย จ–ศ (Ext)',  group: 'เสริม' },
  { key: 'ext_holiday',      label: 'ต่อเช้า หยุด (Ext)', group: 'เสริม' },
  { key: 'smc',              label: 'SMC จ–พฤ',           group: 'เสริม' },
];

const SHIFT_GROUPS = [...new Set(SHIFT_OPTIONS.map((s) => s.group))];

export default function TeamPage() {
  const qc = useQueryClient();
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: async () => (await fetch('/api/members')).json(),
  });

  const [editing, setEditing] = useState<Member | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const refetch = () => qc.invalidateQueries({ queryKey: ['members'] });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: (_, { isActive }) => {
      refetch();
      toast.success(isActive ? 'เปิดใช้งานแล้ว' : 'ปิดใช้งานแล้ว');
    },
  });

  const today = new Date();
  const active = members.filter((m) => m.isActive);
  const inactive = members.filter((m) => !m.isActive);

  function renderRows(list: Member[]) {
    return list.map((m) => {
      const dob = new Date(m.dateOfBirth);
      const age = calculateAge(dob, today);
      const group = getAgeGroup(age);
      const allowedShifts: ShiftType[] | null = m.allowedShifts ? JSON.parse(m.allowedShifts) : null;
      return (
        <tr key={m.id} className={m.isActive ? 'hover:bg-slate-50' : 'opacity-50 bg-slate-50 hover:bg-slate-100'}>
          <td className="px-4 py-3 font-medium">
            <span className={m.isActive ? '' : 'line-through text-slate-400'}>{m.nickname}</span>
          </td>
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
          <td className="px-4 py-3 text-sm text-slate-500">
            {allowedShifts === null ? (
              <span className="text-slate-400 italic">อัตโนมัติ</span>
            ) : allowedShifts.length === 0 ? (
              <Badge color="red">ไม่มีเวร</Badge>
            ) : (
              <span className="text-xs">{allowedShifts.length} เวร</span>
            )}
          </td>
          <td className="px-4 py-3 text-right whitespace-nowrap">
            <button
              title={m.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              className="mr-1 text-slate-500 hover:text-blue-600 transition"
              onClick={() => toggleActiveMutation.mutate({ id: m.id, isActive: !m.isActive })}
            >
              {m.isActive
                ? <ToggleRight className="w-5 h-5 text-blue-600" />
                : <ToggleLeft className="w-5 h-5 text-slate-400" />}
            </button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(m)}><Pencil className="w-3.5 h-3.5" /></Button>
          </td>
        </tr>
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ทีมงาน</h1>
          <p className="text-sm text-slate-500 mt-1">
            ใช้งาน {active.length} คน · ปิดใช้งาน {inactive.length} คน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" />
            Import JSON
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            เพิ่มสมาชิก
          </Button>
        </div>
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
              <th className="px-4 py-3 font-medium">ตั้งครรภ์</th>
              <th className="px-4 py-3 font-medium">เวรที่ทำได้</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">กำลังโหลด…</td></tr>
            )}
            {!isLoading && members.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">ยังไม่มีสมาชิก กดปุ่ม &quot;เพิ่มสมาชิก&quot; เพื่อเริ่มต้น</td></tr>
            )}
            {renderRows(active)}
            {inactive.length > 0 && active.length > 0 && (
              <tr className="bg-slate-100">
                <td colSpan={8} className="px-4 py-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide">
                  ปิดใช้งาน ({inactive.length})
                </td>
              </tr>
            )}
            {renderRows(inactive)}
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

      {showImport && (
        <ImportMembersModal
          onClose={() => setShowImport(false)}
          onSaved={() => { refetch(); setShowImport(false); }}
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
  const [formError, setFormError] = useState<string | null>(null);

  // allowedShifts: null = auto, array = manual
  const initialAllowed: ShiftType[] | null = member?.allowedShifts
    ? JSON.parse(member.allowedShifts)
    : null;
  const [useManual, setUseManual] = useState(initialAllowed !== null);
  const [checked, setChecked] = useState<Set<ShiftType>>(
    new Set(initialAllowed ?? []),
  );

  function toggleShift(s: ShiftType) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    const url = member ? `/api/members/${member.id}` : '/api/members';
    const method = member ? 'PATCH' : 'POST';
    const allowedShifts = useManual ? [...checked] : null;
    const body: Record<string, unknown> = { nickname, phaId, dateOfBirth: dob, pregnancyStatus: pregnancy || null };
    if (allowedShifts !== null) body.allowedShifts = allowedShifts;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const msg = j.error ?? 'บันทึกไม่สำเร็จ';
      setFormError(msg);
      toast.error(msg);
      return;
    }
    toast.success('บันทึกแล้ว');
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={member ? 'แก้ไขสมาชิก' : 'เพิ่มสมาชิก'}>
      <form onSubmit={submit} className="space-y-4">
        {formError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
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

        {/* Shift permission section */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="mb-0">เวรที่ทำได้</Label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <span className={useManual ? 'text-slate-400' : 'text-blue-600 font-medium'}>อัตโนมัติ</span>
              <button
                type="button"
                onClick={() => setUseManual((v) => !v)}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                style={{ backgroundColor: useManual ? '#2563EB' : '#CBD5E1' }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: useManual ? 'translateX(18px)' : 'translateX(3px)' }}
                />
              </button>
              <span className={useManual ? 'text-blue-600 font-medium' : 'text-slate-400'}>กำหนดเอง</span>
            </label>
          </div>

          {useManual ? (
            <div className="space-y-2">
              {SHIFT_GROUPS.map((group) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{group}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {SHIFT_OPTIONS.filter((s) => s.group === group).map((s) => (
                      <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked.has(s.key)}
                          onChange={() => toggleShift(s.key)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-1">
                เลือก {checked.size} / {SHIFT_OPTIONS.length} ประเภท — กฎอายุและสถานะตั้งครรภ์จะถูกข้ามไป
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">คำนวณจากอายุและสถานะตั้งครรภ์โดยอัตโนมัติ</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Import Members JSON modal ─────────────────────────────────────────────────
interface MemberPreview {
  nickname: string;
  phaId: string;
  dateOfBirth: string;
  pregnancyStatus?: string | null;
  isActive?: boolean;
  allowedShifts?: string[] | null;
}

interface MembersImportResult {
  added: number;
  skipped: number;
  skippedDetails: string[];
  invalid: string[];
  total: number;
}

type MImportStep = 'pick' | 'preview' | 'importing' | 'result';

function ImportMembersModal({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<MImportStep>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<MemberPreview[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<MembersImportResult | null>(null);

  function handleFile(f: File) {
    setFile(f);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const items: MemberPreview[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.members)
            ? raw.members
            : Array.isArray(raw?.data)
              ? raw.data
              : null;
        if (!items) throw new Error('ต้องเป็น array หรือ { "members": [...] }');
        const valid = items.filter((i) => i?.nickname && i?.phaId && i?.dateOfBirth);
        if (valid.length === 0) throw new Error('ไม่พบรายการที่มี nickname, phaId และ dateOfBirth ครบ');
        setParsed(valid);
        setStep('preview');
      } catch (err) {
        setParseError(String(err));
      }
    };
    reader.readAsText(f, 'utf-8');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.json')) handleFile(f);
  }

  async function doImport() {
    setStep('importing');
    try {
      const res = await fetch('/api/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'นำเข้าไม่สำเร็จ');
        setStep('preview');
        return;
      }
      setResult(json as MembersImportResult);
      setStep('result');
      if ((json as MembersImportResult).added > 0) {
        toast.success(`เพิ่มสมาชิก ${(json as MembersImportResult).added} คน`);
      }
    } catch {
      toast.error('เชื่อมต่อ server ไม่สำเร็จ');
      setStep('preview');
    }
  }

  function downloadSample() {
    const sample = [
      { nickname: 'สมชาย', phaId: 'PHA001', dateOfBirth: '1990-03-15', pregnancyStatus: null },
      { nickname: 'สมหญิง', phaId: 'PHA002', dateOfBirth: '1985-07-22', pregnancyStatus: null },
      { nickname: 'สมศรี', phaId: 'PHA003', dateOfBirth: '2000-11-05', pregnancyStatus: 'mid' },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'members_sample.json';
    a.click();
  }

  return (
    <Modal open onClose={onClose} title="Import สมาชิกจาก JSON">
      {/* ── pick ── */}
      {step === 'pick' && (
        <div className="space-y-4">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition
              ${parseError ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <FileJson className={`w-10 h-10 ${parseError ? 'text-red-400' : 'text-slate-400'}`} />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
              <p className="text-xs text-slate-400 mt-0.5">รองรับไฟล์ .json เท่านั้น</p>
            </div>
            {parseError && <p className="text-xs text-red-600 text-center">{parseError}</p>}
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* Format hint */}
          <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">รูปแบบ JSON</p>
            <pre className="text-slate-500 overflow-x-auto whitespace-pre-wrap">{`[
  {
    "nickname": "สมชาย",
    "phaId": "PHA001",
    "dateOfBirth": "1990-03-15",
    "pregnancyStatus": null
  }
]`}</pre>
            <div className="text-slate-400 space-y-0.5 pt-0.5">
              <p>• <code>pregnancyStatus</code>: early / mid / late / postpartum / null</p>
              <p>• <code>dateOfBirth</code>: ค.ศ. รูปแบบ YYYY-MM-DD</p>
              <p>• nickname หรือ phaId ที่ซ้ำกับในระบบจะถูกข้าม</p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={downloadSample}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลดตัวอย่าง JSON
            </button>
            <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          </div>
        </div>
      )}

      {/* ── preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <FileJson className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{file?.name}</span>
            <span className="text-slate-400">— พบ {parsed.length} รายการ</span>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-slate-600">ชื่อเล่น</th>
                  <th className="px-3 py-1.5 text-left font-medium text-slate-600">รหัส</th>
                  <th className="px-3 py-1.5 text-left font-medium text-slate-600">วันเกิด</th>
                  <th className="px-3 py-1.5 text-left font-medium text-slate-600">ตั้งครรภ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium">{m.nickname}</td>
                    <td className="px-3 py-1.5 text-slate-600">{m.phaId}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-600">{m.dateOfBirth?.slice(0, 10)}</td>
                    <td className="px-3 py-1.5 text-slate-500">{m.pregnancyStatus ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            nickname หรือ phaId ที่ซ้ำกับสมาชิกในระบบจะถูกข้าม ไม่เขียนทับ
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setStep('pick'); setParsed([]); }}>
              เปลี่ยนไฟล์
            </Button>
            <Button onClick={doImport}>
              <Upload className="w-4 h-4" />
              นำเข้า {parsed.length} รายการ
            </Button>
          </div>
        </div>
      )}

      {/* ── importing ── */}
      {step === 'importing' && (
        <div className="py-10 flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">กำลังนำเข้าข้อมูล…</p>
        </div>
      )}

      {/* ── result ── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-green-800">นำเข้าสำเร็จ</p>
              <p className="text-sm text-green-700 mt-0.5">
                เพิ่มใหม่ <strong>{result.added}</strong> คน
                {result.skipped > 0 && ` · ข้ามซ้ำ ${result.skipped} คน`}
              </p>
            </div>
          </div>

          {result.skippedDetails.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                ข้ามเพราะซ้ำ ({result.skippedDetails.length})
              </p>
              <ul className="max-h-28 overflow-y-auto rounded-md bg-amber-50 border border-amber-200 p-3 space-y-0.5">
                {result.skippedDetails.map((d, i) => (
                  <li key={i} className="text-xs text-amber-800">• {d}</li>
                ))}
              </ul>
            </div>
          )}

          {result.invalid.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                รายการที่มีปัญหา ({result.invalid.length})
              </p>
              <ul className="max-h-28 overflow-y-auto rounded-md bg-red-50 border border-red-200 p-3 space-y-0.5">
                {result.invalid.map((d, i) => (
                  <li key={i} className="text-xs text-red-800">• {d}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button onClick={onSaved}>เสร็จสิ้น</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
