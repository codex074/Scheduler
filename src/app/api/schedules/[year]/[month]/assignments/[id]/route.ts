import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { violatesHardConstraints, type Assignment, type Slot, type ShiftType } from '@/lib/scheduler';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ year: string; month: string; id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const current = await prisma.shiftAssignment.findUnique({
    where: { id },
    include: { schedule: { include: { assignments: true } } },
  });
  if (!current) return NextResponse.json({ error: 'ไม่พบ assignment' }, { status: 404 });

  const newMemberId = body.memberId ?? current.memberId;
  const newShiftType = (body.shiftType ?? current.shiftType) as ShiftType;
  const newDate = body.date ? new Date(String(body.date).slice(0, 10) + 'T00:00:00.000Z') : current.date;

  const others: Assignment[] = current.schedule.assignments
    .filter((a) => a.id !== id)
    .map((a) => ({
      memberId: a.memberId,
      slot: {
        id: a.id,
        date: a.date,
        shiftType: a.shiftType as ShiftType,
        index: 0,
        dayType: (a.date.getUTCDay() === 0 || a.date.getUTCDay() === 6) ? 'holiday' : 'working',
      },
    }));
  const candidate: Slot = {
    id,
    date: newDate,
    shiftType: newShiftType,
    index: 0,
    dayType: (newDate.getUTCDay() === 0 || newDate.getUTCDay() === 6) ? 'holiday' : 'working',
  };
  if (violatesHardConstraints(newMemberId, candidate, others)) {
    return NextResponse.json({ error: 'ละเมิด hard constraint' }, { status: 400 });
  }

  const updated = await prisma.shiftAssignment.update({
    where: { id },
    data: { memberId: newMemberId, shiftType: newShiftType, date: newDate },
    include: { member: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string; id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.shiftAssignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'ลบไม่สำเร็จ', detail: String(err) }, { status: 400 });
  }
}
