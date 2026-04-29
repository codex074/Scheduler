import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { violatesHardConstraints, type Assignment, type Slot, type ShiftType } from '@/lib/scheduler';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year: y, month: m } = await params;
  const year = Number(y);
  const month = Number(m);
  const body = await req.json();
  const { memberId, date, shiftType } = body ?? {};
  if (!memberId || !date || !shiftType) {
    return NextResponse.json({ error: 'memberId, date, shiftType จำเป็น' }, { status: 400 });
  }

  const schedule = await prisma.schedule.findUnique({
    where: { year_month: { year, month } },
    include: { assignments: true },
  });
  if (!schedule) return NextResponse.json({ error: 'ยังไม่ได้สร้างตาราง' }, { status: 404 });

  const dateObj = new Date(String(date).slice(0, 10) + 'T00:00:00.000Z');
  const dow = dateObj.getUTCDay();
  const dayType = dow === 0 || dow === 6 ? 'holiday' : 'working';
  const candidate: Slot = {
    id: 'manual',
    date: dateObj,
    shiftType: shiftType as ShiftType,
    index: 0,
    dayType,
  };
  const existing: Assignment[] = schedule.assignments.map((a) => ({
    memberId: a.memberId,
    slot: {
      id: a.id,
      date: a.date,
      shiftType: a.shiftType as ShiftType,
      index: 0,
      dayType: (a.date.getUTCDay() === 0 || a.date.getUTCDay() === 6) ? 'holiday' : 'working',
    },
  }));
  if (violatesHardConstraints(memberId, candidate, existing)) {
    return NextResponse.json({ error: 'ละเมิด hard constraint' }, { status: 400 });
  }

  const created = await prisma.shiftAssignment.create({
    data: { scheduleId: schedule.id, memberId, date: dateObj, shiftType },
    include: { member: true },
  });
  return NextResponse.json(created, { status: 201 });
}
