import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    orderBy: { nickname: 'asc' },
  });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { nickname, phaId, dateOfBirth, pregnancyStatus } = body ?? {};
  if (!nickname || !phaId || !dateOfBirth) {
    return NextResponse.json({ error: 'nickname, phaId, dateOfBirth จำเป็น' }, { status: 400 });
  }
  try {
    const member = await prisma.teamMember.create({
      data: {
        nickname: String(nickname).trim(),
        phaId: String(phaId).trim(),
        dateOfBirth: new Date(dateOfBirth),
        pregnancyStatus: pregnancyStatus ?? null,
      },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'ไม่สามารถเพิ่มสมาชิก (อาจมีชื่อเล่นหรือรหัสซ้ำ)', detail: String(err) },
      { status: 400 },
    );
  }
}
