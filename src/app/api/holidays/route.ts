import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = url.searchParams.get('year');
  const where = year
    ? {
        date: {
          gte: new Date(Date.UTC(Number(year), 0, 1)),
          lt: new Date(Date.UTC(Number(year) + 1, 0, 1)),
        },
      }
    : {};
  const holidays = await prisma.publicHoliday.findMany({ where, orderBy: { date: 'asc' } });
  return NextResponse.json(holidays);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { date, name } = body ?? {};
  if (!date || !name) {
    return NextResponse.json({ error: 'date และ name จำเป็น' }, { status: 400 });
  }
  try {
    const iso = String(date).slice(0, 10);
    const holiday = await prisma.publicHoliday.create({
      data: { date: new Date(iso + 'T00:00:00.000Z'), name: String(name) },
    });
    return NextResponse.json(holiday, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'เพิ่มวันหยุดไม่สำเร็จ (อาจซ้ำ)', detail: String(err) }, { status: 400 });
  }
}
