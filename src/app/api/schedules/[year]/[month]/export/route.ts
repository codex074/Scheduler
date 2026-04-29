import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { buildScheduleWorkbook } from '@/lib/excel/exporter';
import { toISODate } from '@/lib/scheduler/slots';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year: y, month: m } = await params;
  const year = Number(y);
  const month = Number(m);

  const schedule = await prisma.schedule.findUnique({
    where: { year_month: { year, month } },
    include: { assignments: { include: { member: true } } },
  });
  if (!schedule) return NextResponse.json({ error: 'ไม่พบตาราง' }, { status: 404 });

  const memberIds = Array.from(new Set(schedule.assignments.map((a) => a.memberId)));
  const allMembers = await prisma.teamMember.findMany();
  // Order: members in schedule first (active or not), then any extra active
  const inSchedule = allMembers.filter((m) => memberIds.includes(m.id));
  const others = allMembers.filter((m) => !memberIds.includes(m.id) && m.isActive);
  const members = [...inSchedule, ...others].map((m) => ({
    id: m.id,
    nickname: m.nickname,
    phaId: m.phaId,
    dateOfBirth: m.dateOfBirth,
    pregnancyStatus: m.pregnancyStatus,
  }));

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const holidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: yearStart, lt: yearEnd } },
  });
  const buf = await buildScheduleWorkbook({
    year,
    month,
    members,
    assignments: schedule.assignments.map((a) => ({
      memberId: a.memberId, date: a.date, shiftType: a.shiftType,
    })),
    publicHolidayISODates: holidays.map((h) => toISODate(h.date)),
  });

  const filename = `pharmacy_schedule_${year}_${String(month).padStart(2, '0')}.xlsx`;
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
