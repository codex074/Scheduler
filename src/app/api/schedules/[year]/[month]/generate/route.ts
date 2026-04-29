import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateSchedule, SchedulingError, type Member } from '@/lib/scheduler';
import { toISODate } from '@/lib/scheduler/slots';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year: y, month: m } = await params;
  const year = Number(y);
  const month = Number(m);

  const dbMembers = await prisma.teamMember.findMany({ where: { isActive: true } });
  const members: Member[] = dbMembers.map((m) => ({
    id: m.id,
    nickname: m.nickname,
    phaId: m.phaId,
    dateOfBirth: m.dateOfBirth,
    pregnancyStatus: (m.pregnancyStatus ?? null) as Member['pregnancyStatus'],
  }));

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const holidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: yearStart, lt: yearEnd } },
  });
  const publicHolidayISODates = holidays.map((h) => toISODate(h.date));

  try {
    const result = generateSchedule({ year, month, members, publicHolidayISODates });

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
            data: { status: 'draft', notes: result.notes.join('\n') },
          })
        : await tx.schedule.create({
            data: { year, month, status: 'draft', notes: result.notes.join('\n') },
          });

      if (result.assignments.length > 0) {
        await tx.shiftAssignment.createMany({
          data: result.assignments.map((a) => ({
            scheduleId: sched.id,
            memberId: a.memberId,
            date: a.slot.date,
            shiftType: a.slot.shiftType,
          })),
        });
      }
      return sched;
    });

    return NextResponse.json({
      schedule,
      summary: {
        assigned: result.assignments.length,
        unassigned: result.unassignedSlots.length,
        score: result.score,
        notes: result.notes,
      },
    });
  } catch (err) {
    if (err instanceof SchedulingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'จัดตารางไม่สำเร็จ', detail: String(err) }, { status: 500 });
  }
}
