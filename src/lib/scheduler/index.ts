import { balanceWorkload } from './balance';
import { getAllowedShifts } from './eligibility';
import { generateSlots } from './slots';
import { solveOnce } from './solver';
import { scoreSolution } from './scoring';
import {
  SchedulingError,
  type Assignment,
  type Member,
  type SchedulerInput,
  type SchedulerResult,
  type ShiftType,
  type Slot,
} from './types';

export { generateSlots } from './slots';
export { getAllowedShifts } from './eligibility';
export { violatesHardConstraints } from './constraints';
export { solveOnce } from './solver';
export { scoreSolution } from './scoring';
export { balanceWorkload } from './balance';
export * from './types';

export interface GenerateOptions {
  restarts?: number;
}

export function generateSchedule(
  input: SchedulerInput,
  options: GenerateOptions = {},
): SchedulerResult {
  const { year, month, members, publicHolidayISODates } = input;
  const restarts = options.restarts ?? 5;

  if (members.length === 0) {
    throw new SchedulingError('ไม่มีบุคลากรในระบบ — กรุณาเพิ่มทีมก่อน');
  }

  const refDate = new Date(Date.UTC(year, month - 1, 1));
  const slots: Slot[] = generateSlots(year, month, publicHolidayISODates);

  const eligibility = new Map<string, Set<ShiftType>>();
  for (const m of members) eligibility.set(m.id, getAllowedShifts(m, refDate));

  // Quick feasibility check
  for (const slot of slots) {
    const eligible = members.filter((m) => eligibility.get(m.id)?.has(slot.shiftType));
    if (eligible.length === 0) {
      throw new SchedulingError(
        `ไม่มีบุคลากรที่สามารถทำเวร "${slot.shiftType}" ได้เลย — ตรวจสอบกฎอายุและสถานะตั้งครรภ์`,
      );
    }
  }

  const publicHolidaySet = new Set(publicHolidayISODates);
  let best: { assignments: Assignment[]; unassigned: Slot[]; score: number; breakdown: Record<string, number> } | null = null;
  const notes: string[] = [];

  for (let r = 0; r < restarts; r++) {
    const { assignments, unassigned } = solveOnce(slots, members, eligibility, r * 1009 + 7);
    const balanced = balanceWorkload(assignments, members, eligibility, refDate);
    const { score, breakdown } = scoreSolution(balanced, members, refDate, { publicHolidaySet });
    if (!best || unassigned.length < best.unassigned.length || (unassigned.length === best.unassigned.length && score > best.score)) {
      best = { assignments: balanced, unassigned, score, breakdown };
    }
  }

  if (!best) throw new SchedulingError('ไม่สามารถจัดตารางได้');

  if (best.unassigned.length > 0) {
    notes.push(`ยังมี ${best.unassigned.length} slot ที่จัดไม่ได้`);
  }
  notes.push(`คะแนน soft constraints: ${best.score} (${JSON.stringify(best.breakdown)})`);

  return {
    assignments: best.assignments,
    unassignedSlots: best.unassigned,
    score: best.score,
    notes,
  };
}
