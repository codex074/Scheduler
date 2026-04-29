import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');

  const whereSchedule = yearParam
    ? { status: 'finalized', year: Number(yearParam) }
    : { status: 'finalized' };

  const schedules = await prisma.schedule.findMany({
    where: whereSchedule,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      assignments: {
        include: { member: true },
      },
    },
  });

  const members = await prisma.teamMember.findMany({
    orderBy: { nickname: 'asc' },
  });

  // Build per-member per-shiftType totals across all finalized months
  const totals: Record<string, Record<string, number>> = {};
  for (const m of members) totals[m.id] = {};

  for (const sched of schedules) {
    for (const a of sched.assignments) {
      if (!totals[a.memberId]) totals[a.memberId] = {};
      totals[a.memberId][a.shiftType] = (totals[a.memberId][a.shiftType] ?? 0) + 1;
    }
  }

  // Timeline: one entry per finalized schedule
  const timeline = schedules.map((s) => {
    const perMember: Record<string, Record<string, number>> = {};
    for (const a of s.assignments) {
      if (!perMember[a.memberId]) perMember[a.memberId] = {};
      perMember[a.memberId][a.shiftType] = (perMember[a.memberId][a.shiftType] ?? 0) + 1;
    }
    return {
      year: s.year,
      month: s.month,
      scheduleId: s.id,
      totalAssignments: s.assignments.length,
      perMember,
    };
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      nickname: m.nickname,
      phaId: m.phaId,
      isActive: m.isActive,
    })),
    totals,
    timeline,
    availableYears: await prisma.schedule
      .findMany({
        where: { status: 'finalized' },
        select: { year: true },
        distinct: ['year'],
        orderBy: { year: 'desc' },
      })
      .then((rows) => rows.map((r) => r.year)),
  });
}
