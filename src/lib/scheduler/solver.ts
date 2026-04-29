import { violatesHardConstraints } from './constraints';
import type { Assignment, Member, ShiftType, Slot, Solution } from './types';

/** simple seeded PRNG (mulberry32) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Order slots so that the most-constrained (fewest eligible members) come first */
function sortSlotsByTightness(
  slots: Slot[],
  eligibility: Map<string, Set<ShiftType>>,
  rand: () => number,
): Slot[] {
  const eligibleCount = (slot: Slot) => {
    let c = 0;
    for (const set of eligibility.values()) if (set.has(slot.shiftType)) c++;
    return c;
  };
  // Stable shuffle within ties for diversity across restarts
  const decorated = slots.map((s) => ({
    s,
    tight: eligibleCount(s),
    jitter: rand(),
  }));
  decorated.sort((a, b) => a.tight - b.tight || a.s.date.getTime() - b.s.date.getTime() || a.jitter - b.jitter);
  return decorated.map((d) => d.s);
}

/** Try to assign all slots once with greedy + bounded backtracking. */
export function solveOnce(
  slots: Slot[],
  members: Member[],
  eligibility: Map<string, Set<ShiftType>>,
  seed: number,
  options: { maxBacktrackSteps?: number } = {},
): { assignments: Assignment[]; unassigned: Slot[] } {
  const rand = mulberry32(seed + 1);
  const ordered = sortSlotsByTightness(slots, eligibility, rand);
  const assignments: Assignment[] = [];
  // workload tracker for tie-breaking — prefer least-loaded eligible candidate
  const load = new Map<string, number>();
  for (const m of members) load.set(m.id, 0);

  const maxSteps = options.maxBacktrackSteps ?? 200_000;
  let steps = 0;
  const unassigned: Slot[] = [];

  function recurse(idx: number): boolean {
    if (idx === ordered.length) return true;
    if (steps++ > maxSteps) return false;
    const slot = ordered[idx];
    let candidates = members.filter((m) => eligibility.get(m.id)?.has(slot.shiftType));
    // sort by current load asc, randomize within same load
    candidates = candidates
      .map((m) => ({ m, load: load.get(m.id) ?? 0, jitter: rand() }))
      .sort((a, b) => a.load - b.load || a.jitter - b.jitter)
      .map((x) => x.m);

    for (const cand of candidates) {
      if (violatesHardConstraints(cand.id, slot, assignments)) continue;
      assignments.push({ memberId: cand.id, slot });
      load.set(cand.id, (load.get(cand.id) ?? 0) + 1);
      if (recurse(idx + 1)) return true;
      assignments.pop();
      load.set(cand.id, (load.get(cand.id) ?? 0) - 1);
      if (steps > maxSteps) return false;
    }
    return false;
  }

  const ok = recurse(0);
  if (!ok) {
    // Re-run greedily without backtracking to fill what's possible
    const filledSet = new Set(assignments.map((a) => a.slot.id));
    for (const slot of ordered) {
      if (filledSet.has(slot.id)) continue;
      let candidates = members.filter((m) => eligibility.get(m.id)?.has(slot.shiftType));
      candidates = candidates
        .map((m) => ({ m, load: load.get(m.id) ?? 0, jitter: rand() }))
        .sort((a, b) => a.load - b.load || a.jitter - b.jitter)
        .map((x) => x.m);
      let placed = false;
      for (const cand of candidates) {
        if (violatesHardConstraints(cand.id, slot, assignments)) continue;
        assignments.push({ memberId: cand.id, slot });
        load.set(cand.id, (load.get(cand.id) ?? 0) + 1);
        placed = true;
        break;
      }
      if (!placed) unassigned.push(slot);
    }
  }
  return { assignments, unassigned };
}

export function emptySolution(): Solution {
  return { assignments: [] };
}
