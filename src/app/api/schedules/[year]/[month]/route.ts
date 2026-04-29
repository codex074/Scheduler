import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year, month } = await params;
  const schedule = await prisma.schedule.findUnique({
    where: { year_month: { year: Number(year), month: Number(month) } },
    include: {
      assignments: {
        include: { member: true },
        orderBy: [{ date: 'asc' }, { shiftType: 'asc' }],
      },
    },
  });
  if (!schedule) return NextResponse.json({ error: 'ไม่พบตาราง' }, { status: 404 });
  return NextResponse.json(schedule);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year, month } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  try {
    const updated = await prisma.schedule.update({
      where: { year_month: { year: Number(year), month: Number(month) } },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'แก้ไขไม่สำเร็จ', detail: String(err) }, { status: 400 });
  }
}
