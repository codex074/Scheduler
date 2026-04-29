import {
  calculateAge,
  getAgeGroup,
  SHIFT_CATEGORY,
  type Member,
  type ShiftCategory,
  type ShiftType,
} from './types';

const ALL_SHIFTS: ShiftType[] = [
  'morning-SURG', 'morning-MED-DC', 'morning-MED-Cont', 'morning-ER',
  'afternoon-MED', 'afternoon-ER', 'night',
  'dawn-OPD', 'dawn-ER', 'ext_weekday', 'ext_holiday', 'smc',
];

/** category permissions for pregnancy + age groups */
const PREGNANCY_PERMS: Record<
  Exclude<Member['pregnancyStatus'], null>,
  Record<ShiftCategory, boolean>
> = {
  early:      { morning: true,  afternoon: true,  night: true,  aux: true  },
  mid:        { morning: true,  afternoon: false, night: false, aux: false },
  late:       { morning: false, afternoon: false, night: false, aux: false },
  postpartum: { morning: true,  afternoon: true,  night: true,  aux: true  },
};

const AGE_PERMS: Record<ReturnType<typeof getAgeGroup>, Record<ShiftCategory, boolean>> = {
  '>=50':  { morning: false, afternoon: false, night: false, aux: false },
  '47-49': { morning: true,  afternoon: false, night: false, aux: false }, // morning-SURG only handled below
  '45-46': { morning: true,  afternoon: true,  night: false, aux: false },
  '33-44': { morning: true,  afternoon: true,  night: true,  aux: true  },
  '<33':   { morning: true,  afternoon: true,  night: true,  aux: true  },
};

export function getAllowedShifts(member: Member, refDate: Date): Set<ShiftType> {
  const allowed = new Set<ShiftType>();

  // Step 1: pregnancy override
  if (member.pregnancyStatus) {
    const perms = PREGNANCY_PERMS[member.pregnancyStatus];
    for (const s of ALL_SHIFTS) {
      if (perms[SHIFT_CATEGORY[s]]) allowed.add(s);
    }
    return allowed;
  }

  // Step 2: age rule
  const age = calculateAge(member.dateOfBirth, refDate);
  const group = getAgeGroup(age);
  const perms = AGE_PERMS[group];

  for (const s of ALL_SHIFTS) {
    const cat = SHIFT_CATEGORY[s];
    if (!perms[cat]) continue;
    // 47-49 special: only morning-SURG allowed within morning
    if (group === '47-49' && cat === 'morning' && s !== 'morning-SURG') continue;
    allowed.add(s);
  }
  return allowed;
}
