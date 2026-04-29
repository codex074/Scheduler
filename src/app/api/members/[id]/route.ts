import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.nickname !== undefined) data.nickname = String(body.nickname).trim();
  if (body.phaId !== undefined) data.phaId = String(body.phaId).trim();
  if (body.dateOfBirth !== undefined) data.dateOfBirth = new Date(body.dateOfBirth);
  if (body.pregnancyStatus !== undefined) data.pregnancyStatus = body.pregnancyStatus || null;
  if (body.isActive !== undefined) data.isActive = !!body.isActive;
  if (body.allowedShifts !== undefined) {
    data.allowedShifts = body.allowedShifts === null ? null : JSON.stringify(body.allowedShifts);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await prisma.teamMember.update({ where: { id }, data: data as any });
    return NextResponse.json(member);
  } catch (err) {
    const detail = String(err);
    const isDuplicate = detail.includes('Unique') || detail.includes('unique');
    return NextResponse.json(
      { error: isDuplicate ? 'ชื่อเล่นหรือรหัสนี้มีอยู่ในระบบแล้ว' : 'แก้ไขไม่สำเร็จ', detail },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.teamMember.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'ลบไม่สำเร็จ', detail: String(err) }, { status: 400 });
  }
}
