import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const members = await prisma.teamMember.findMany({
    orderBy: { nickname: 'asc' },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { nickname, phaId, dateOfBirth, pregnancyStatus, allowedShifts } = body ?? {};
  if (!nickname || !phaId || !dateOfBirth) {
    return NextResponse.json({ error: 'nickname, phaId, dateOfBirth จำเป็น' }, { status: 400 });
  }
  try {
    // Build data object — only include allowedShifts when explicitly set
    // (omitting keeps the DB default NULL and avoids issues with stale Prisma clients)
    const data: Record<string, unknown> = {
      nickname: String(nickname).trim(),
      phaId: String(phaId).trim(),
      dateOfBirth: new Date(dateOfBirth),
      pregnancyStatus: pregnancyStatus ?? null,
    };
    if (allowedShifts !== undefined && allowedShifts !== null) {
      data.allowedShifts = JSON.stringify(allowedShifts);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await prisma.teamMember.create({ data: data as any });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    const detail = String(err);
    const isDuplicate = detail.includes('Unique') || detail.includes('unique');
    return NextResponse.json(
      {
        error: isDuplicate
          ? 'ชื่อเล่นหรือรหัสนี้มีอยู่ในระบบแล้ว'
          : 'ไม่สามารถเพิ่มสมาชิกได้',
        detail,
      },
      { status: 400 },
    );
  }
}
