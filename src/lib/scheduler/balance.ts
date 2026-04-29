import { violatesHardConstraints } from './constraints';
import {
  calculateAge,
  getAgeGroup,
  type Assignment,
  type Member,
  type ShiftType,
} from './types';

/**
 * Try to swap individual shifts between heaviest and lightest members
 * within the same age/pregnancy group to reduce load variance, while
 * preserving HC1-HC4.
 */
export function balanceWorkload(
  assignments: Assignment[],
  members: Member[],
  eligibility: Map<string, Set<ShiftType>>,
  refDate: Date,
): Assignment[] {
  const groups = new Map<string, Member[]>();
  for (const m of members) {
    const key = m.pregnancyStatus
      ? `preg-${m.pregnancyStatus}`
      : `age-${getAgeGroup(calculateAge(m.dateOfBirth, refDate))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const work = assignments.slice();

  function loadOf(memberId: string): number {
    return work.reduce((c, a) => c + (a.memberId === memberId ? 1 : 0), 0);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    let safety = group.length * 30;
    while (safety-- > 0) {
      const sorted = group
        .map((m) => ({ m, load: loadOf(m.id) }))
        .sort((a, b) => a.load - b.load);
      const lightest = sorted[0];
      const heaviest = sorted[sorted.length - 1];
      if (heaviest.load - lightest.load <= 1) break;

      // Find a shift on heaviest that lightest is eligible for and HC-clean to take
      const heavyAssignments = work.filter((a) => a.memberId === heaviest.m.id);
      let swapped = false;
      for (const ha of heavyAssignments) {
        if (!eligibility.get(lightest.m.id)?.has(ha.slot.shiftType)) continue;
        const tentative = work.filter((x) => x !== ha);
        if (violatesHardConstraints(lightest.m.id, ha.slot, tentative)) continue;
        // commit swap
        const idx = work.indexOf(ha);
        work[idx] = { memberId: lightest.m.id, slot: ha.slot };
        swapped = true;
        break;
      }
      if (!swapped) break;
    }
  }
  return work;
}
