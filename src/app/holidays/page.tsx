'use client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Button, Card, Input, Label, Modal, Select } from '@/components/ui';
import { Plus, Trash2, Upload, FileJson, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
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
  const [showImport, setShowImport] = useState(false);

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">วันหยุด</h1>
          <p className="text-sm text-slate-500 mt-1">
            วันหยุดราชการที่ใช้ในการจัดเวร
            {holidays.length > 0 && ` · ${holidays.length} วัน`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-32">
            {[year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>{y + 543}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" />
            Import JSON
          </Button>
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
            {isLoading && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">กำลังโหลด…</td></tr>
            )}
            {!isLoading && holidays.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  ยังไม่มีวันหยุดในปี {year + 543}
                  <span className="ml-2 text-blue-500 cursor-pointer hover:underline" onClick={() => setShowImport(true)}>
                    Import JSON
                  </span>
                </td>
              </tr>
            )}
            {holidays.map((h) => {
              const d = new Date(h.date);
              return (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium tabular-nums">{h.date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{THAI_DAY_NAMES[d.getUTCDay()]}</td>
                  <td className="px-4 py-3">{h.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`ลบ "${h.name}"?`)) remove.mutate(h.id);
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

      {showImport && (
        <ImportJsonModal onClose={() => setShowImport(false)} onSaved={(y) => {
          qc.invalidateQueries({ queryKey: ['holidays', y] });
          if (y !== year) setYear(y);
          setShowImport(false);
        }} />
      )}
    </div>
  );
}

// ── Add single holiday modal ──────────────────────────────────────────────────
function AddHolidayModal({ year, onClose, onSaved }: {
  year: number; onClose: () => void; onSaved: () => void;
}) {
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

// ── Import JSON modal ─────────────────────────────────────────────────────────
interface ParsedHoliday {
  date: string;
  name: string;
}

interface ImportResult {
  added: number;
  skipped: number;
  invalid: string[];
  total: number;
}

type ImportStep = 'pick' | 'preview' | 'importing' | 'result';

function ImportJsonModal({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: (year: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedHoliday[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Group by year for preview
  const byYear = parsed.reduce<Record<number, ParsedHoliday[]>>((acc, h) => {
    const y = new Date(h.date).getFullYear();
    if (!acc[y]) acc[y] = [];
    acc[y].push(h);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort();

  function handleFile(f: File) {
    setFile(f);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const items: ParsedHoliday[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.holidays)
            ? raw.holidays
            : Array.isArray(raw?.data)
              ? raw.data
              : null;
        if (!items) throw new Error('ต้องเป็น array หรือ { "holidays": [...] }');
        // Validate minimally
        const valid = items.filter((i) => i?.date && i?.name);
        if (valid.length === 0) throw new Error('ไม่พบรายการที่มี "date" และ "name"');
        setParsed(valid);
        setStep('preview');
      } catch (err) {
        setParseError(String(err));
        setStep('pick');
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
      const res = await fetch('/api/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const json: ImportResult = await res.json();
      if (!res.ok) {
        toast.error((json as unknown as { error: string }).error ?? 'นำเข้าไม่สำเร็จ');
        setStep('preview');
        return;
      }
      setResult(json);
      setStep('result');
      if (json.added > 0) toast.success(`เพิ่มวันหยุด ${json.added} วัน`);
    } catch {
      toast.error('เชื่อมต่อ server ไม่สำเร็จ');
      setStep('preview');
    }
  }

  function downloadSample() {
    const sample = [
      { date: `${new Date().getFullYear()}-01-01`, name: 'วันขึ้นปีใหม่' },
      { date: `${new Date().getFullYear()}-04-06`, name: 'วันจักรี' },
      { date: `${new Date().getFullYear()}-04-13`, name: 'วันสงกรานต์' },
    ];
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'holidays_sample.json';
    a.click();
  }

  return (
    <Modal open onClose={onClose} title="Import วันหยุดจาก JSON">
      {/* ── Step: pick file ── */}
      {step === 'pick' && (
        <div className="space-y-4">
          {/* Drop zone */}
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
            {parseError && (
              <p className="text-xs text-red-600 text-center">{parseError}</p>
            )}
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
            <p className="font-medium text-slate-700">รูปแบบ JSON ที่รองรับ</p>
            <pre className="text-slate-500 overflow-x-auto whitespace-pre-wrap">{`[
  { "date": "2568-01-01", "name": "วันขึ้นปีใหม่" },
  { "date": "2568-04-13", "name": "วันสงกรานต์" }
]`}</pre>
            <p className="text-slate-400">หรือ <code>{`{ "holidays": [...] }`}</code> ก็ได้ · วันที่ใช้ค.ศ. (YYYY-MM-DD)</p>
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

      {/* ── Step: preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <FileJson className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{file?.name}</span>
            <span className="text-slate-400">— พบ {parsed.length} รายการ</span>
          </div>

          {/* Year summary */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {years.map((y) => (
              <div key={y} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                <p className="text-sm font-semibold text-slate-700">{y + 543}</p>
                <p className="text-xs text-slate-500">{byYear[y].length} วัน</p>
              </div>
            ))}
          </div>

          {/* Preview list */}
          <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-slate-600">วันที่</th>
                  <th className="px-3 py-1.5 text-left font-medium text-slate-600">ชื่อวันหยุด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-mono text-slate-600">{h.date}</td>
                    <td className="px-3 py-1.5">{h.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">วันที่มีอยู่แล้วในระบบจะถูกข้าม ไม่ถูกเขียนทับ</p>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => { setStep('pick'); setParsed([]); }}>เปลี่ยนไฟล์</Button>
            <Button onClick={doImport}>
              <Upload className="w-4 h-4" />
              นำเข้า {parsed.length} รายการ
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: importing ── */}
      {step === 'importing' && (
        <div className="py-10 flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">กำลังนำเข้าข้อมูล…</p>
        </div>
      )}

      {/* ── Step: result ── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-medium text-green-800">นำเข้าสำเร็จ</p>
              <p className="text-sm text-green-700">
                เพิ่มใหม่ <strong>{result.added}</strong> วัน
                {result.skipped > 0 && ` · ข้ามซ้ำ ${result.skipped} วัน`}
              </p>
            </div>
          </div>

          {result.invalid.length > 0 && (
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                รายการที่ข้าม ({result.invalid.length})
              </p>
              <ul className="max-h-32 overflow-y-auto rounded-md bg-amber-50 border border-amber-200 p-3 space-y-1">
                {result.invalid.map((w, i) => (
                  <li key={i} className="text-xs text-amber-800">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              onClick={() => {
                // navigate to the first year from imported data
                onSaved(years[0] ?? new Date().getFullYear());
              }}
            >
              ดูวันหยุด
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
