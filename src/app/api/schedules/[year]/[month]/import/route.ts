import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseScheduleWorkbook } from '@/lib/excel/importer';
import { toISODate } from '@/lib/scheduler/slots';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year: y, month: m } = await params;
  const year = Number(y);
  const month = Number(m);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'ปี/เดือนไม่ถูกต้อง' }, { status: 400 });
  }

  // Parse multipart form
  let fileBuffer: Buffer;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'ไม่พบไฟล์ในคำขอ' }, { status: 400 });
    const arrayBuf = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuf);
  } catch {
    return NextResponse.json({ error: 'อ่านไฟล์ไม่สำเร็จ' }, { status: 400 });
  }

  // Load holidays for the year (for ext disambiguation)
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const holidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: yearStart, lt: yearEnd } },
  });
  const publicHolidayISODates = holidays.map((h) => toISODate(h.date));

  // Parse Excel
  let parsed;
  try {
    parsed = await parseScheduleWorkbook(fileBuffer, year, month, publicHolidayISODates);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 422 });
  }

  if (parsed.assignments.length === 0) {
    return NextResponse.json(
      { error: 'ไม่พบข้อมูลเวรในไฟล์', warnings: parsed.warnings },
      { status: 422 },
    );
  }

  // Match imported members to DB by nickname first, then phaId
  const dbMembers = await prisma.teamMember.findMany();
  const byNickname = new Map(dbMembers.map((m) => [m.nickname.toLowerCase(), m]));
  const byPhaId = new Map(dbMembers.map((m) => [m.phaId.toLowerCase(), m]));

  const resolvedMap = new Map<string, string>(); // nickname → memberId
  const notFound: string[] = [];

  for (const key of parsed.memberKeys) {
    const k = key.nickname;
    if (resolvedMap.has(k)) continue;
    const found =
      byNickname.get(k.toLowerCase()) ??
      (key.phaId ? byPhaId.get(key.phaId.toLowerCase()) : undefined);
    if (found) {
      resolvedMap.set(k, found.id);
    } else {
      notFound.push(`${k}${key.phaId ? ` (${key.phaId})` : ''}`);
    }
  }

  if (notFound.length > 0) {
    parsed.warnings.push(
      `ไม่พบสมาชิกต่อไปนี้ในระบบ (ข้ามไป): ${notFound.join(', ')}`,
    );
  }

  // Build final assignment rows (only for resolved members)
  const assignmentData: Array<{ memberId: string; date: Date; shiftType: string }> = [];
  for (const a of parsed.assignments) {
    const memberId = resolvedMap.get(a.nickname);
    if (!memberId) continue;
    const date = new Date(Date.UTC(year, month - 1, a.day));
    assignmentData.push({ memberId, date, shiftType: a.shiftType });
  }

  if (assignmentData.length === 0) {
    return NextResponse.json(
      { error: 'ไม่สามารถ match บุคลากรในไฟล์กับข้อมูลในระบบได้เลย', warnings: parsed.warnings },
      { status: 422 },
    );
  }

  // Upsert schedule + replace assignments in a transaction
  const schedule = await prisma.$transaction(async (tx) => {
    const existing = await tx.schedule.findUnique({
      where: { year_month: { year, month } },
    });
    if (existing) {
      await tx.shiftAssignment.deleteMany({ where: { scheduleId: existing.id } });
    }
    const sched = existing
      ? await tx.schedule.update({
          where: { id: existing.id },
          data: { status: 'finalized', notes: `นำเข้าจาก Excel` },
        })
      : await tx.schedule.create({
          data: { year, month, status: 'finalized', notes: `นำเข้าจาก Excel` },
        });

    await tx.shiftAssignment.createMany({
      data: assignmentData.map((a) => ({
        scheduleId: sched.id,
        memberId: a.memberId,
        date: a.date,
        shiftType: a.shiftType,
      })),
    });
    return sched;
  });

  return NextResponse.json({
    ok: true,
    scheduleId: schedule.id,
    imported: assignmentData.length,
    warnings: parsed.warnings,
  });
}
