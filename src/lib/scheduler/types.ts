export type ShiftType =
  | 'afternoon-MED'
  | 'afternoon-ER'
  | 'ext_weekday'
  | 'ext_holiday'
  | 'smc'
  | 'dawn-OPD'
  | 'dawn-ER'
  | 'night'
  | 'morning-SURG'
  | 'morning-MED-DC'
  | 'morning-MED-Cont'
  | 'morning-ER';

export type ShiftCategory = 'morning' | 'afternoon' | 'night' | 'aux';

export type DayType = 'working' | 'holiday';

export type PregnancyStatus = 'early' | 'mid' | 'late' | 'postpartum' | null;

export interface Member {
  id: string;
  nickname: string;
  phaId: string;
  dateOfBirth: Date;
  pregnancyStatus: PregnancyStatus;
  allowedShifts: ShiftType[] | null; // null = use auto rules; array = manual override
}

export interface Slot {
  id: string; // unique e.g. "2026-04-01__afternoon-MED__0"
  date: Date; // midnight UTC
  shiftType: ShiftType;
  index: number; // 0..count-1 within same date+shiftType
  dayType: DayType;
}

export interface Assignment {
  memberId: string;
  slot: Slot;
}

export interface Solution {
  assignments: Assignment[];
}

export interface SchedulerInput {
  year: number;
  month: number; // 1-12
  members: Member[];
  publicHolidayISODates: string[]; // YYYY-MM-DD
}

export interface SchedulerResult {
  assignments: Assignment[];
  unassignedSlots: Slot[];
  score: number;
  notes: string[];
}

export class SchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulingError';
  }
}

export const SHIFT_CATEGORY: Record<ShiftType, ShiftCategory> = {
  'morning-SURG': 'morning',
  'morning-MED-DC': 'morning',
  'morning-MED-Cont': 'morning',
  'morning-ER': 'morning',
  'afternoon-MED': 'afternoon',
  'afternoon-ER': 'afternoon',
  night: 'night',
  'dawn-OPD': 'aux',
  'dawn-ER': 'aux',
  ext_weekday: 'aux',
  ext_holiday: 'aux',
  smc: 'aux',
};

export type AgeGroup = '>=50' | '47-49' | '45-46' | '33-44' | '<33';

export function getAgeGroup(age: number): AgeGroup {
  if (age >= 50) return '>=50';
  if (age >= 47) return '47-49';
  if (age >= 45) return '45-46';
  if (age >= 33) return '33-44';
  return '<33';
}

export function calculateAge(dateOfBirth: Date, refDate: Date): number {
  let age = refDate.getFullYear() - dateOfBirth.getFullYear();
  const m = refDate.getMonth() - dateOfBirth.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}
