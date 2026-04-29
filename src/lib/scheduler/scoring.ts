import {
  calculateAge,
  getAgeGroup,
  SHIFT_CATEGORY,
  type Assignment,
  type Member,
  type Slot,
} from './types';
import { toISODate } from './slots';

interface ScoreContext {
  publicHolidaySet: Set<string>;
}

export function scoreSolution(
  assignments: Assignment[],
  members: Member[],
  refDate: Date,
  ctx: ScoreContext,
): { score: number; breakdown: Record<string, number> } {
  let score = 0;
  const breakdown: Record<string, number> = { SC1: 0, SC2: 0, SC3: 0, SC4: 0, SC5: 0, SC6: 0, SC7: 0 };

  // group assignments per member, sorted by date
  const byMember = new Map<string, Assignment[]>();
  for (const m of members) byMember.set(m.id, []);
  for (const a of assignments) {
    if (!byMember.has(a.memberId)) byMember.set(a.memberId, []);
    byMember.get(a.memberId)!.push(a);
  }
  for (const arr of byMember.values()) {
    arr.sort((x, y) => x.slot.date.getTime() - y.slot.date.getTime());
  }

  // SC1: 3 consecutive same-category shifts
  for (const arr of byMember.values()) {
    let run = 1;
    for (let i = 1; i < arr.length; i++) {
      const same = SHIFT_CATEGORY[arr[i].slot.shiftType] === SHIFT_CATEGORY[arr[i - 1].slot.shiftType];
      if (same) {
        run++;
        if (run >= 3) breakdown.SC1 -= 1;
      } else run = 1;
    }
  }

  // SC2: gap variance
  for (const arr of byMember.values()) {
    if (arr.length < 3) continue;
    const gaps: number[] = [];
    for (let i = 1; i < arr.length; i++) {
      gaps.push((arr[i].slot.date.getTime() - arr[i - 1].slot.date.getTime()) / (24 * 3600 * 1000));
    }
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
    if (variance > 6) breakdown.SC2 -= 2;
  }

  // SC3: holiday shift fairness
  const holidayCount = new Map<string, number>();
  for (const m of members) holidayCount.set(m.id, 0);
  for (const a of assignments) {
    if (ctx.publicHolidaySet.has(toISODate(a.slot.date))) {
      holidayCount.set(a.memberId, (holidayCount.get(a.memberId) ?? 0) + 1);
    }
  }
  const holidayValues = [...holidayCount.values()];
  if (holidayValues.length > 0) {
    const avg = holidayValues.reduce((s, v) => s + v, 0) / holidayValues.length;
    for (const v of holidayValues) {
      if (v > avg + 1) breakdown.SC3 -= 5;
    }
  }

  // SC5: weekend (Sat/Sun) deviation
  const weekendCount = new Map<string, number>();
  for (const m of members) weekendCount.set(m.id, 0);
  for (const a of assignments) {
    const dow = a.slot.date.getUTCDay();
    if (dow === 0 || dow === 6) {
      weekendCount.set(a.memberId, (weekendCount.get(a.memberId) ?? 0) + 1);
    }
  }
  const wknd = [...weekendCount.values()];
  if (wknd.length > 0) {
    const avg = wknd.reduce((s, v) => s + v, 0) / wknd.length;
    for (const v of wknd) {
      if (Math.abs(v - avg) > 2) breakdown.SC5 -= 2;
    }
  }

  // SC6: consecutive nights
  for (const arr of byMember.values()) {
    const nights = arr.filter((a) => a.slot.shiftType === 'night').map((a) => a.slot.date);
    nights.sort((a, b) => a.getTime() - b.getTime());
    for (let i = 1; i < nights.length; i++) {
      const diff = (nights[i].getTime() - nights[i - 1].getTime()) / (24 * 3600 * 1000);
      if (diff === 1) breakdown.SC6 -= 10;
    }
  }

  // SC7: workload deviation within age group (only for non-pregnant members; treat each pregnancy as own bucket)
  const groups = new Map<string, string[]>();
  for (const m of members) {
    const key = m.pregnancyStatus
      ? `preg-${m.pregnancyStatus}`
      : `age-${getAgeGroup(calculateAge(m.dateOfBirth, refDate))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m.id);
  }
  const totalByMember = new Map<string, number>();
  for (const m of members) totalByMember.set(m.id, 0);
  for (const a of assignments) totalByMember.set(a.memberId, (totalByMember.get(a.memberId) ?? 0) + 1);
  for (const ids of groups.values()) {
    if (ids.length === 0) continue;
    const totals = ids.map((id) => totalByMember.get(id) ?? 0);
    const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
    for (const t of totals) breakdown.SC7 -= Math.round(Math.abs(t - avg));
  }

  score = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { score, breakdown };
}
