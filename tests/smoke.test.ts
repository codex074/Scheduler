import { describe, it, expect } from 'vitest';
import { getShiftColor } from '@/lib/constants';

describe('smoke', () => {
  it('getShiftColor handles known symbols', () => {
    expect(getShiftColor('บM')).toBe('#E3F2FD');
    expect(getShiftColor('ด')).toBe('#EDE7F6');
    expect(getShiftColor('รO/SMC')).toBe('#FFF3E0');
  });
});
