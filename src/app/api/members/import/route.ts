import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface MemberInput {
  nickname: string;
  phaId: string;
  dateOfBirth: string;
  pregnancyStatus?: string | null;
  isActive?: boolean;
  allowedShifts?: string[] | null;
}

const VALID_PREGNANCY = new Set(['early', 'mid', 'late', 'postpartum']);

function parseBody(raw: unknown): MemberInput[] {
  if (Array.isArray(raw)) return raw as MemberInput[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.members)) return obj.members as MemberInput[];
    if (Array.isArray(obj.data)) return obj.data as MemberInput[];
  }
  throw new Error('รูปแบบ JSON ไม่ถูกต้อง — ต้องเป็น array หรือ { "members": [...] }');
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'ไม่สามารถอ่าน JSON ได้' }, { status: 400 });
  }

  let items: MemberInput[];
  try {
    items = parseBody(raw);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: 'ไม่มีข้อมูลสมาชิกในไฟล์' }, { status: 400 });
  }

  // Validate each entry
  const invalid: string[] = [];
  type ValidRow = {
    nickname: string;
    phaId: string;
    dateOfBirth: Date;
    pregnancyStatus: string | null;
    isActive: boolean;
    allowedShifts: string | null;
  };
  const valid: ValidRow[] = [];

  for (const item of items) {
    const nick = String(item.nickname ?? '').trim();
    const phaId = String(item.phaId ?? '').trim();
    const dobRaw = String(item.dateOfBirth ?? '').trim();

    if (!nick) { invalid.push(`ข้ามรายการ: ไม่มี nickname — ${JSON.stringify(item)}`); continue; }
    if (!phaId) { invalid.push(`ข้าม "${nick}": ไม่มี phaId`); continue; }
    if (!dobRaw) { invalid.push(`ข้าม "${nick}": ไม่มี dateOfBirth`); continue; }

    const dob = new Date(dobRaw.slice(0, 10) + 'T00:00:00.000Z');
    if (isNaN(dob.getTime())) {
      invalid.push(`ข้าม "${nick}": dateOfBirth "${dobRaw}" ไม่ถูกต้อง`);
      continue;
    }

    const pregnancy = item.pregnancyStatus ?? null;
    if (pregnancy !== null && !VALID_PREGNANCY.has(String(pregnancy))) {
      invalid.push(`ข้าม "${nick}": pregnancyStatus "${pregnancy}" ไม่ถูกต้อง (early/mid/late/postpartum)`);
      continue;
    }

    let allowedShifts: string | null = null;
    if (Array.isArray(item.allowedShifts)) {
      allowedShifts = JSON.stringify(item.allowedShifts);
    }

    valid.push({
      nickname: nick,
      phaId,
      dateOfBirth: dob,
      pregnancyStatus: pregnancy ? String(pregnancy) : null,
      isActive: item.isActive !== false,
      allowedShifts,
    });
  }

  if (valid.length === 0) {
    return NextResponse.json({ error: 'ไม่มีรายการที่ถูกต้อง', invalid }, { status: 422 });
  }

  // Find which nicknames/phaIds already exist
  const existingNicks = new Set(
    (await prisma.teamMember.findMany({ select: { nickname: true } }))
      .map((m) => m.nickname.toLowerCase()),
  );
  const existingPhaIds = new Set(
    (await prisma.teamMember.findMany({ select: { phaId: true } }))
      .map((m) => m.phaId.toLowerCase()),
  );

  let added = 0;
  let skipped = 0;
  const skippedDetails: string[] = [];

  for (const row of valid) {
    if (existingNicks.has(row.nickname.toLowerCase())) {
      skipped++;
      skippedDetails.push(`"${row.nickname}" (nickname ซ้ำ)`);
      continue;
    }
    if (existingPhaIds.has(row.phaId.toLowerCase())) {
      skipped++;
      skippedDetails.push(`"${row.nickname}" (phaId "${row.phaId}" ซ้ำ)`);
      continue;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.teamMember.create as any)({
        data: {
          nickname: row.nickname,
          phaId: row.phaId,
          dateOfBirth: row.dateOfBirth,
          pregnancyStatus: row.pregnancyStatus,
          isActive: row.isActive,
          ...(row.allowedShifts !== null ? { allowedShifts: row.allowedShifts } : {}),
        },
      });
      existingNicks.add(row.nickname.toLowerCase());
      existingPhaIds.add(row.phaId.toLowerCase());
      added++;
    } catch (err) {
      invalid.push(`"${row.nickname}": ${String(err)}`);
    }
  }

  return NextResponse.json({
    added,
    skipped,
    skippedDetails,
    invalid,
    total: items.length,
  });
}
