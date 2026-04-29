import { describe, it, expect } from 'vitest';
import { generateSchedule, SchedulingError } from '@/lib/scheduler';
import type { Member } from '@/lib/scheduler/types';

function mkMember(id: string, age: number, pregnancy: Member['pregnancyStatus'] = null): Member {
  const dob = new Date(Date.UTC(2026 - age, 5, 15));
  return { id, nickname: id, phaId: id, dateOfBirth: dob, pregnancyStatus: pregnancy };
}

describe('generateSchedule (integration)', () => {
  it('team of 12 mixed ages → succeeds and assigns every slot', () => {
    const members: Member[] = [
      mkMember('A', 28),
      mkMember('B', 30),
      mkMember('C', 32),
      mkMember('D', 35),
      mkMember('E', 38),
      mkMember('F', 41),
      mkMember('G', 44),
      mkMember('H', 46), // 45-46
      mkMember('I', 46),
      mkMember('J', 48), // 47-49 (only morning-SURG)
      mkMember('K', 29),
      mkMember('L', 33),
    ];
    const res = generateSchedule({
      year: 2026,
      month: 4,
      members,
      publicHolidayISODates: ['2026-04-13', '2026-04-14', '2026-04-15'],
    });
    expect(res.unassignedSlots.length).toBe(0);
    expect(res.assignments.length).toBeGreaterThan(0);
  });

  it('throws when no members', () => {
    expect(() => generateSchedule({ year: 2026, month: 4, members: [], publicHolidayISODates: [] }))
      .toThrow(SchedulingError);
  });

  it('throws when everyone is 50+', () => {
    const members = [mkMember('A', 51), mkMember('B', 60)];
    expect(() => generateSchedule({ year: 2026, month: 4, members, publicHolidayISODates: [] }))
      .toThrow(SchedulingError);
  });

  it('deterministic with same input', () => {
    const members = [
      mkMember('A', 28), mkMember('B', 30), mkMember('C', 32), mkMember('D', 35),
      mkMember('E', 38), mkMember('F', 41), mkMember('G', 44), mkMember('H', 46),
      mkMember('I', 30), mkMember('J', 36),
    ];
    const r1 = generateSchedule({ year: 2026, month: 4, members, publicHolidayISODates: [] });
    const r2 = generateSchedule({ year: 2026, month: 4, members, publicHolidayISODates: [] });
    expect(r1.assignments.length).toBe(r2.assignments.length);
    expect(r1.score).toBe(r2.score);
  });

  it('generated assignments respect HC1 (no night+dawn same day)', () => {
    const members = [
      mkMember('A', 28), mkMember('B', 30), mkMember('C', 32), mkMember('D', 35),
      mkMember('E', 38), mkMember('F', 41), mkMember('G', 44), mkMember('H', 46),
      mkMember('I', 30), mkMember('J', 36),
    ];
    const res = generateSchedule({ year: 2026, month: 4, members, publicHolidayISODates: [] });
    const byMemberDay = new Map<string, Set<string>>();
    for (const a of res.assignments) {
      const k = `${a.memberId}__${a.slot.date.toISOString().slice(0, 10)}`;
      if (!byMemberDay.has(k)) byMemberDay.set(k, new Set());
      byMemberDay.get(k)!.add(a.slot.shiftType);
    }
    for (const set of byMemberDay.values()) {
      const hasNight = set.has('night');
      const hasDawn = set.has('dawn-OPD') || set.has('dawn-ER');
      expect(hasNight && hasDawn).toBe(false);
    }
  });
});
