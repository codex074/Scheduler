import { describe, it, expect } from 'vitest';
import { getAllowedShifts } from '@/lib/scheduler/eligibility';
import type { Member, ShiftType } from '@/lib/scheduler/types';

const ref = new Date(Date.UTC(2026, 3, 1)); // Apr 1, 2026

function mkMember(age: number, pregnancy: Member['pregnancyStatus'] = null): Member {
  const dob = new Date(Date.UTC(2026 - age, 3, 1));
  return {
    id: 'm',
    nickname: 'x',
    phaId: 'p',
    dateOfBirth: dob,
    pregnancyStatus: pregnancy,
    allowedShifts: null,
  };
}

const ALL_SHIFTS: ShiftType[] = [
  'morning-SURG', 'morning-MED-DC', 'morning-MED-Cont', 'morning-ER',
  'afternoon-MED', 'afternoon-ER', 'night',
  'dawn-OPD', 'dawn-ER', 'ext_weekday', 'ext_holiday', 'smc',
];

describe('getAllowedShifts (HC5)', () => {
  it('age 50+ => empty', () => {
    expect(getAllowedShifts(mkMember(50), ref).size).toBe(0);
    expect(getAllowedShifts(mkMember(55), ref).size).toBe(0);
  });

  it('age 47-49 => only morning-SURG', () => {
    const allowed = getAllowedShifts(mkMember(48), ref);
    expect([...allowed]).toEqual(['morning-SURG']);
  });

  it('age 45-46 => all morning + afternoon, no night/aux', () => {
    const allowed = getAllowedShifts(mkMember(45), ref);
    expect(allowed.has('morning-SURG')).toBe(true);
    expect(allowed.has('morning-MED-DC')).toBe(true);
    expect(allowed.has('morning-ER')).toBe(true);
    expect(allowed.has('afternoon-MED')).toBe(true);
    expect(allowed.has('afternoon-ER')).toBe(true);
    expect(allowed.has('night')).toBe(false);
    expect(allowed.has('dawn-OPD')).toBe(false);
    expect(allowed.has('smc')).toBe(false);
    expect(allowed.has('ext_weekday')).toBe(false);
  });

  it('age 33-44 => all shifts', () => {
    const allowed = getAllowedShifts(mkMember(35), ref);
    for (const s of ALL_SHIFTS) expect(allowed.has(s)).toBe(true);
  });

  it('age <33 => all shifts', () => {
    const allowed = getAllowedShifts(mkMember(28), ref);
    for (const s of ALL_SHIFTS) expect(allowed.has(s)).toBe(true);
  });

  it('pregnancy "early" allows all (override)', () => {
    const allowed = getAllowedShifts(mkMember(48, 'early'), ref);
    for (const s of ALL_SHIFTS) expect(allowed.has(s)).toBe(true);
  });

  it('pregnancy "mid" => only morning shifts', () => {
    const allowed = getAllowedShifts(mkMember(30, 'mid'), ref);
    expect(allowed.has('morning-SURG')).toBe(true);
    expect(allowed.has('morning-ER')).toBe(true);
    expect(allowed.has('afternoon-MED')).toBe(false);
    expect(allowed.has('night')).toBe(false);
    expect(allowed.has('dawn-OPD')).toBe(false);
    expect(allowed.has('smc')).toBe(false);
  });

  it('pregnancy "late" => empty', () => {
    expect(getAllowedShifts(mkMember(30, 'late'), ref).size).toBe(0);
  });

  it('pregnancy "postpartum" => all shifts (override age)', () => {
    const allowed = getAllowedShifts(mkMember(48, 'postpartum'), ref);
    for (const s of ALL_SHIFTS) expect(allowed.has(s)).toBe(true);
  });

  it('age boundary: turning 33 on ref date => 33-44 group', () => {
    const dob = new Date(Date.UTC(2026 - 33, 3, 1));
    const m: Member = { id: 'm', nickname: 'x', phaId: 'p', dateOfBirth: dob, pregnancyStatus: null, allowedShifts: null };
    const allowed = getAllowedShifts(m, ref);
    expect(allowed.has('night')).toBe(true);
  });
});
