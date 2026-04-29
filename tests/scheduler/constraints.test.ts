import { describe, it, expect } from 'vitest';
import { violatesHardConstraints } from '@/lib/scheduler/constraints';
import type { Assignment, Slot, ShiftType } from '@/lib/scheduler/types';

function mkSlot(iso: string, shiftType: ShiftType, index = 0): Slot {
  const date = new Date(iso + 'T00:00:00.000Z');
  const dow = date.getUTCDay();
  const dayType = dow === 0 || dow === 6 ? 'holiday' : 'working';
  return { id: `${iso}__${shiftType}__${index}`, date, shiftType, index, dayType };
}

function asg(memberId: string, slot: Slot): Assignment {
  return { memberId, slot };
}

describe('HC1 — night + dawn same day forbidden', () => {
  it('night D then dawn-OPD same day => violation', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'night'))];
    const candidate = mkSlot('2026-04-01', 'dawn-OPD');
    expect(violatesHardConstraints('A', candidate, existing)).toBe(true);
  });
  it('night D then dawn-ER same day => violation', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'night'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'dawn-ER'), existing)).toBe(true);
  });
  it('night D for A, dawn-OPD same day for B => allowed', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'night'))];
    expect(violatesHardConstraints('B', mkSlot('2026-04-01', 'dawn-OPD'), existing)).toBe(false);
  });
});

describe('HC2 — night then morning same day forbidden', () => {
  it('night D then morning-SURG same day => violation', () => {
    const existing = [asg('A', mkSlot('2026-04-04', 'night'))]; // Sat
    expect(violatesHardConstraints('A', mkSlot('2026-04-04', 'morning-SURG'), existing)).toBe(true);
  });
});

describe('HC3 — afternoon D then night D+1 forbidden', () => {
  it('afternoon-MED D then night D+1 => violation', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'afternoon-MED'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-02', 'night'), existing)).toBe(true);
  });
  it('afternoon-MED D then night D+2 => allowed', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'afternoon-MED'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-03', 'night'), existing)).toBe(false);
  });
  it('afternoon-MED D then night same D => caught by HC4 (overlap)', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'afternoon-MED'))];
    // Note: night same day actually starts at 00:00 — practically not overlapping with 16:30-23:59
    // but HC3 is strictly D+1. Same D night is a different case (allowed by HC3).
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'night'), existing)).toBe(false);
  });
});

describe('HC4 — overlapping shifts', () => {
  it('ext_weekday + smc same day => violation', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'ext_weekday'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'smc'), existing)).toBe(true);
  });
  it('ext_weekday + afternoon-MED same day => violation (afternoon covers 16:30-23:59)', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'ext_weekday'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'afternoon-MED'), existing)).toBe(true);
  });
  it('smc + afternoon-MED same day => violation', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'smc'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'afternoon-MED'), existing)).toBe(true);
  });
  it('dawn-OPD + ext_weekday same day => allowed', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'dawn-OPD'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'ext_weekday'), existing)).toBe(false);
  });
  it('dawn-OPD + smc same day => allowed', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'dawn-OPD'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'smc'), existing)).toBe(false);
  });
  it('dawn-OPD + afternoon-MED same day => allowed', () => {
    const existing = [asg('A', mkSlot('2026-04-01', 'dawn-OPD'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'afternoon-MED'), existing)).toBe(false);
  });
  it('two same exact slot type same day => violation (duplicate slot)', () => {
    // Already assigned afternoon-MED idx 0; can't take it twice
    const existing = [asg('A', mkSlot('2026-04-01', 'afternoon-MED'))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-01', 'afternoon-MED', 0), existing)).toBe(true);
  });
  it('two morning-SURG (idx 0 and 1) same day same person => violation (still overlapping morning)', () => {
    const existing = [asg('A', mkSlot('2026-04-04', 'morning-SURG', 0))];
    expect(violatesHardConstraints('A', mkSlot('2026-04-04', 'morning-SURG', 1), existing)).toBe(true);
  });
});
