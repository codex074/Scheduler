import { SHIFT_CATEGORY, type Assignment, type ShiftType, type Slot } from './types';
import { toISODate } from './slots';

/** Time intervals (minutes from local midnight on the *date* of the slot).
 * For night shift the interval is 0..510 of the *date* it is dated to.
 * afternoon = 990..1439 (16:30 - 23:59).
 * dawn = 420..510 (07:00 - 08:30).
 * ext_weekday/smc = 990..1230 (16:30 - 20:30).
 * ext_holiday = 540..780 (09:00 - 13:00).
 * morning = 510..990 (08:30 - 16:30).
 * night = 0..510 of date D.
 */
function shiftInterval(shiftType: ShiftType): [number, number] {
  switch (shiftType) {
    case 'morning-SURG':
    case 'morning-MED-DC':
    case 'morning-MED-Cont':
    case 'morning-ER':
      return [510, 990];
    case 'afternoon-MED':
    case 'afternoon-ER':
      return [990, 1440];
    case 'night':
      return [0, 510];
    case 'dawn-OPD':
    case 'dawn-ER':
      return [420, 510];
    case 'ext_weekday':
    case 'smc':
      return [990, 1230];
    case 'ext_holiday':
      return [540, 780];
  }
}

function intervalsOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

function dateDeltaDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (24 * 3600 * 1000));
}

/**
 * Check whether assigning `memberId` to `candidate` would violate HC1-HC4
 * given the existing list of assignments.
 */
export function violatesHardConstraints(
  memberId: string,
  candidate: Slot,
  existing: Assignment[],
): boolean {
  const cIso = toISODate(candidate.date);
  const cInterval = shiftInterval(candidate.shiftType);
  const cCat = SHIFT_CATEGORY[candidate.shiftType];

  for (const a of existing) {
    if (a.memberId !== memberId) continue;
    const eIso = toISODate(a.slot.date);
    const eCat = SHIFT_CATEGORY[a.slot.shiftType];
    const dayDiff = dateDeltaDays(candidate.date, a.slot.date); // candidate - existing

    // HC1 — same day: night + dawn (any direction)
    if (eIso === cIso) {
      if ((eCat === 'night' && candidate.shiftType.startsWith('dawn-')) ||
          (a.slot.shiftType.startsWith('dawn-') && cCat === 'night')) {
        return true;
      }
      // HC2 — same day: night + morning (any direction)
      if ((eCat === 'night' && cCat === 'morning') ||
          (eCat === 'morning' && cCat === 'night')) {
        return true;
      }
    }

    // HC3 — afternoon D then night D+1 (any direction)
    if (eCat === 'afternoon' && cCat === 'night' && dayDiff === 1) return true;
    if (eCat === 'night' && cCat === 'afternoon' && dayDiff === -1) return true;

    // HC4 — overlap on same day
    if (eIso === cIso) {
      const eInterval = shiftInterval(a.slot.shiftType);
      if (intervalsOverlap(cInterval, eInterval)) return true;
    }
  }
  return false;
}
