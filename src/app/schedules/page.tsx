'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { Button, Card, Modal, Select, Label, Badge } from '@/components/ui';
import { THAI_MONTH_NAMES } from '@/lib/constants';
import { Plus, ArrowRight, Upload, FileUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ตารางเวร</h1>
          <p className="text-sm text-slate-500 mt-1">ตารางเวรทั้งหมด เรียงจากใหม่ไปเก่า</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" />
            Import Excel
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            สร้างตารางเดือนใหม่
          </Button>
        </div>
      </div>

      <Card>
        {isLoading && <div className="px-4 py-8 text-center text-slate-400">กำลังโหลด…</div>}
        {!isLoading && schedules.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-400">ยังไม่มีตาราง</div>
        )}
        <ul className="divide-y">
          {schedules.map((s) => (
            <li key={s.id}>
              <Link
                href={`/schedules/${s.year}/${s.month}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <div className="font-medium">{THAI_MONTH_NAMES[s.month - 1]} {s.year + 543}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{s._count.assignments} เวร</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={s.status === 'finalized' ? 'green' : 'yellow'}>
                    {s.status === 'finalized' ? 'ยืนยันแล้ว' : 'ฉบับร่าง'}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
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

type ImportStep = 'pick' | 'uploading' | 'result';

interface ImportResult {
  ok: boolean;
  scheduleId?: string;
  imported?: number;
  warnings?: string[];
  error?: string;
  year?: number;
  month?: number;
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ImportStep>('pick');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const yearRange = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 5 + i);

  async function doImport() {
    if (!file) return;
    setStep('uploading');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/schedules/${year}/${month}/import`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ['schedules'] });
        qc.invalidateQueries({ queryKey: ['history'] });
        setResult({ ok: true, ...json, year, month });
        toast.success(`นำเข้าสำเร็จ ${json.imported} เวร`);
      } else {
        setResult({ ok: false, ...json, year, month });
      }
    } catch {
      setResult({ ok: false, error: 'เชื่อมต่อ server ไม่สำเร็จ', year, month });
    }
    setStep('result');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.xlsx')) setFile(f);
  }

  return (
    <Modal open onClose={onClose} title="Import ข้อมูลเวรจาก Excel">
      {step === 'pick' && (
        <div className="space-y-5">
          {/* Year / month picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>ปี</Label>
              <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {yearRange.map((y) => (
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
          </div>

          {/* File drop zone */}
          <div>
            <Label>ไฟล์ Excel (.xlsx)</Label>
            <div
              className={`mt-1 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition cursor-pointer
                ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className={`w-8 h-8 ${file ? 'text-blue-500' : 'text-slate-400'}`} />
              {file ? (
                <p className="text-sm font-medium text-blue-700">{file.name}</p>
              ) : (
                <>
                  <p className="text-sm text-slate-600">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
                  <p className="text-xs text-slate-400">รองรับไฟล์ .xlsx เท่านั้น</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-0.5">
            <p className="font-medium">หมายเหตุ</p>
            <p>• รองรับทั้ง format ของโปรแกรมนี้ และไฟล์เก่า (NickName / pha_id)</p>
            <p>• ตารางเดือนนี้จะถูกแทนที่ทั้งหมด และบันทึกเป็น &quot;ยืนยันแล้ว&quot; อัตโนมัติ</p>
            <p>• บุคลากรที่ไม่ตรงกับในระบบจะถูกข้าม (แจ้งใน warnings)</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
            <Button onClick={doImport} disabled={!file}>
              <Upload className="w-4 h-4" />
              นำเข้าข้อมูล
            </Button>
          </div>
        </div>
      )}

      {step === 'uploading' && (
        <div className="py-10 flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">กำลังนำเข้าข้อมูล…</p>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-4">
          {result.ok ? (
            <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-800">นำเข้าสำเร็จ</p>
                <p className="text-sm text-green-700 mt-0.5">
                  นำเข้า <strong>{result.imported}</strong> เวร สำหรับ{' '}
                  <strong>{THAI_MONTH_NAMES[(result.month ?? 1) - 1]} {(result.year ?? 0) + 543}</strong>
                  {' '}— บันทึกเป็น &quot;ยืนยันแล้ว&quot; แล้ว
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-800">นำเข้าไม่สำเร็จ</p>
                <p className="text-sm text-red-700 mt-0.5">{result.error}</p>
              </div>
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                คำเตือน ({result.warnings.length})
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto rounded-md bg-amber-50 border border-amber-200 p-3">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-800">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            {result.ok ? (
              <>
                <Button variant="secondary" onClick={onClose}>ปิด</Button>
                <Button onClick={() => {
                  onClose();
                  router.push(`/schedules/${result.year}/${result.month}`);
                }}>
                  ดูตาราง
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setStep('pick')}>ลองใหม่</Button>
                <Button variant="secondary" onClick={onClose}>ปิด</Button>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
