import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface HolidayInput {
  date: string;
  name: string;
}

function parseBody(raw: unknown): HolidayInput[] {
  if (Array.isArray(raw)) return raw as HolidayInput[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.holidays)) return obj.holidays as HolidayInput[];
    if (Array.isArray(obj.data)) return obj.data as HolidayInput[];
  }
  throw new Error('รูปแบบ JSON ไม่ถูกต้อง — ต้องเป็น array หรือ { "holidays": [...] }');
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถอ่าน JSON ได้' }, { status: 400 });
  }

  let items: HolidayInput[];
  try {
    items = parseBody(raw);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลวันหยุดในไฟล์' }, { status: 400 });
  }

  // Validate and normalise each entry
  const valid: Array<{ date: Date; isoKey: string; name: string }> = [];
  const invalid: string[] = [];

  for (const item of items) {
    if (!item.date || !item.name) {
      invalid.push(`ข้อมูลไม่ครบ: ${JSON.stringify(item)}`);
      continue;
    }
    const iso = String(item.date).trim().slice(0, 10);
    const parsed = new Date(iso + 'T00:00:00.000Z');
    if (isNaN(parsed.getTime())) {
      invalid.push(`วันที่ไม่ถูกต้อง: "${item.date}"`);
      continue;
    }
    valid.push({ date: parsed, isoKey: iso, name: String(item.name).trim() });
  }

  if (valid.length === 0) {
    return NextResponse.json({ error: 'ไม่มีรายการที่ถูกต้อง', invalid }, { status: 422 });
  }

  // Find which dates already exist in DB
  const existing = await prisma.publicHoliday.findMany({
    where: { date: { in: valid.map((v) => v.date) } },
    select: { date: true },
  });
  const existingKeys = new Set(existing.map((e) => e.date.toISOString().slice(0, 10)));

  const toCreate = valid.filter((v) => !existingKeys.has(v.isoKey));
  const skipped = valid.length - toCreate.length;

  let added = 0;
  const errors: string[] = [];

  // Insert new records one-by-one so a single failure doesn't abort all
  for (const h of toCreate) {
    try {
      await prisma.publicHoliday.create({
        data: { date: h.date, name: h.name },
      });
      added++;
    } catch (err) {
      errors.push(`${h.isoKey}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    added,
    skipped,
    invalid: [...invalid, ...errors],
    total: items.length,
  });
}
