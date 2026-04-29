import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.publicHoliday.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'ลบไม่สำเร็จ', detail: String(err) }, { status: 400 });
  }
}
