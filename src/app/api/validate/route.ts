import { NextResponse } from 'next/server';
import { violatesHardConstraints, type Assignment, type ShiftType } from '@/lib/scheduler';

interface Body {
  assignments: Array<{ memberId: string; date: string; shiftType: ShiftType }>;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const list: Assignment[] = body.assignments.map((a, i) => {
    const date = new Date(String(a.date).slice(0, 10) + 'T00:00:00.000Z');
    const dow = date.getUTCDay();
    return {
      memberId: a.memberId,
      slot: {
        id: String(i),
        date,
        shiftType: a.shiftType,
        index: 0,
        dayType: dow === 0 || dow === 6 ? 'holiday' : 'working',
      },
    };
  });
  const violations: Array<{ index: number; reason: string }> = [];
  for (let i = 0; i < list.length; i++) {
    const others = list.filter((_, j) => j !== i);
    if (violatesHardConstraints(list[i].memberId, list[i].slot, others)) {
      violations.push({ index: i, reason: 'Hard constraint violation' });
    }
  }
  return NextResponse.json({ violations });
}
