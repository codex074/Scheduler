import type { DayType, ShiftType, Slot } from './types';

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isPublicHoliday(date: Date, holidayISOSet: Set<string>): boolean {
  return holidayISOSet.has(toISODate(date));
}

export function getDayType(date: Date, holidayISOSet: Set<string>): DayType {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return 'holiday';
  if (isPublicHoliday(date, holidayISOSet)) return 'holiday';
  return 'working';
}

interface SlotSpec {
  shiftType: ShiftType;
  count: number;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Working day specs depend on day-of-week */
function workingDaySpecs(dow: number): SlotSpec[] {
  // dow: 1=Mon..5=Fri (only called for Mon-Fri non-holiday)
  const specs: SlotSpec[] = [
    { shiftType: 'afternoon-MED', count: 1 },
    { shiftType: 'afternoon-ER', count: 1 },
    { shiftType: 'ext_weekday', count: 1 },
    { shiftType: 'dawn-OPD', count: 1 },
    { shiftType: 'night', count: 1 },
  ];
  // SMC: Mon-Thu (1..4)
  if (dow >= 1 && dow <= 4) specs.push({ shiftType: 'smc', count: 2 });
  // dawn-ER: Tue-Fri (2..5)
  if (dow >= 2 && dow <= 5) specs.push({ shiftType: 'dawn-ER', count: 1 });
  return specs;
}

function holidayDaySpecs(): SlotSpec[] {
  return [
    { shiftType: 'morning-SURG', count: 2 },
    { shiftType: 'morning-MED-DC', count: 1 },
    { shiftType: 'morning-MED-Cont', count: 1 },
    { shiftType: 'morning-ER', count: 1 },
    { shiftType: 'ext_holiday', count: 1 },
    { shiftType: 'afternoon-MED', count: 1 },
    { shiftType: 'afternoon-ER', count: 1 },
    { shiftType: 'night', count: 1 },
  ];
}

export function generateSlots(
  year: number,
  month: number,
  publicHolidayISODates: string[],
): Slot[] {
  const holidaySet = new Set(publicHolidayISODates);
  const days = getDaysInMonth(year, month);
  const slots: Slot[] = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(Date.UTC(year, month - 1, d));
    const dayType = getDayType(date, holidaySet);
    const dow = date.getUTCDay(); // 0=Sun..6=Sat
    const specs = dayType === 'working' ? workingDaySpecs(dow) : holidayDaySpecs();
    const iso = toISODate(date);
    for (const spec of specs) {
      for (let i = 0; i < spec.count; i++) {
        slots.push({
          id: `${iso}__${spec.shiftType}__${i}`,
          date,
          shiftType: spec.shiftType,
          index: i,
          dayType,
        });
      }
    }
  }
  return slots;
}
