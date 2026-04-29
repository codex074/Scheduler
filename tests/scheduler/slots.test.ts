import { describe, it, expect } from 'vitest';
import { generateSlots, getDayType, isPublicHoliday } from '@/lib/scheduler/slots';

describe('generateSlots', () => {
  it('Feb 2024 has 29 days (leap year)', () => {
    const slots = generateSlots(2024, 2, []);
    const distinctDates = new Set(slots.map((s) => s.date.toISOString().slice(0, 10)));
    expect(distinctDates.size).toBe(29);
  });

  it('working day (Wed) has correct slots: 1xafternoon-MED, 1xER, 1xext_weekday, 2xsmc, 1xdawn-OPD, 1xdawn-ER, 1xnight', () => {
    // 2026-04-01 is Wednesday
    const slots = generateSlots(2026, 4, []).filter(
      (s) => s.date.toISOString().slice(0, 10) === '2026-04-01',
    );
    const counts: Record<string, number> = {};
    for (const s of slots) counts[s.shiftType] = (counts[s.shiftType] ?? 0) + 1;
    expect(counts['afternoon-MED']).toBe(1);
    expect(counts['afternoon-ER']).toBe(1);
    expect(counts['ext_weekday']).toBe(1);
    expect(counts['smc']).toBe(2);
    expect(counts['dawn-OPD']).toBe(1);
    expect(counts['dawn-ER']).toBe(1);
    expect(counts['night']).toBe(1);
    expect(slots.length).toBe(8);
  });

  it('Friday has dawn-OPD and dawn-ER (Tue-Fri rule)', () => {
    // 2026-04-03 is Friday
    const slots = generateSlots(2026, 4, []).filter(
      (s) => s.date.toISOString().slice(0, 10) === '2026-04-03',
    );
    const types = slots.map((s) => s.shiftType);
    expect(types).toContain('dawn-OPD');
    expect(types).toContain('dawn-ER');
    expect(types).not.toContain('smc'); // smc is Mon-Thu only
  });

  it('Monday has smc but not dawn-ER', () => {
    // 2026-04-06 is Monday
    const slots = generateSlots(2026, 4, []).filter(
      (s) => s.date.toISOString().slice(0, 10) === '2026-04-06',
    );
    const types = slots.map((s) => s.shiftType);
    expect(types.filter((t) => t === 'smc')).toHaveLength(2);
    expect(types).toContain('dawn-OPD');
    expect(types).not.toContain('dawn-ER');
  });

  it('Saturday is treated as holiday', () => {
    // 2026-04-04 is Saturday
    const slots = generateSlots(2026, 4, []).filter(
      (s) => s.date.toISOString().slice(0, 10) === '2026-04-04',
    );
    const types = slots.map((s) => s.shiftType).sort();
    expect(types).toEqual(
      [
        'afternoon-ER',
        'afternoon-MED',
        'ext_holiday',
        'morning-ER',
        'morning-MED-Cont',
        'morning-MED-DC',
        'morning-SURG',
        'morning-SURG',
        'night',
      ].sort(),
    );
  });

  it('public holiday on Wed produces holiday slots, not working', () => {
    // 2026-04-15 is Wed; mark as holiday
    const slots = generateSlots(2026, 4, ['2026-04-15']).filter(
      (s) => s.date.toISOString().slice(0, 10) === '2026-04-15',
    );
    const types = slots.map((s) => s.shiftType);
    expect(types).toContain('morning-SURG');
    expect(types).not.toContain('dawn-OPD');
  });

  it('all slots have unique ids', () => {
    const slots = generateSlots(2026, 4, []);
    const ids = new Set(slots.map((s) => s.id));
    expect(ids.size).toBe(slots.length);
  });
});

describe('getDayType / isPublicHoliday', () => {
  it('Sat/Sun => holiday', () => {
    expect(getDayType(new Date(Date.UTC(2026, 3, 4)), new Set())).toBe('holiday'); // Sat
    expect(getDayType(new Date(Date.UTC(2026, 3, 5)), new Set())).toBe('holiday'); // Sun
  });
  it('Wed not holiday => working', () => {
    expect(getDayType(new Date(Date.UTC(2026, 3, 1)), new Set())).toBe('working');
  });
  it('Wed marked as public holiday => holiday', () => {
    const set = new Set(['2026-04-15']);
    expect(isPublicHoliday(new Date(Date.UTC(2026, 3, 15)), set)).toBe(true);
    expect(getDayType(new Date(Date.UTC(2026, 3, 15)), set)).toBe('holiday');
  });
});
