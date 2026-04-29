import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { assignments: true } } },
  });
  return NextResponse.json(schedules);
}
