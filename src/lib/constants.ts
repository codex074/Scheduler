export const SHIFT_SYMBOLS: Record<string, string> = {
  'afternoon-MED': 'บM',
  'afternoon-ER': 'บE',
  ext_weekday: 'Ext',
  ext_holiday: 'Ext',
  smc: 'SMC',
  'dawn-OPD': 'รO',
  'dawn-ER': 'รE',
  night: 'ด',
  'morning-SURG': 's',
  'morning-MED-DC': 'd',
  'morning-MED-Cont': 'c',
  'morning-ER': 'e',
};

export const SHIFT_COLORS = {
  morning: { hex: '#FFFDE7', label: 'เหลืองอ่อน' },
  afternoon: { hex: '#E3F2FD', label: 'ฟ้าอ่อน' },
  night: { hex: '#EDE7F6', label: 'ม่วงอ่อน' },
  dawn: { hex: '#FFF3E0', label: 'ส้มอ่อน' },
  ext: { hex: '#E8F5E9', label: 'เขียวอ่อน' },
  smc: { hex: '#FCE4EC', label: 'ชมพูอ่อน' },
  holiday_header: { hex: '#FFEBEE', label: 'แดงอ่อน' },
} as const;

export function getShiftColor(symbol: string): string {
  const first = symbol.split('/')[0];
  if (['s', 'd', 'c', 'e'].includes(first)) return SHIFT_COLORS.morning.hex;
  if (['บM', 'บE'].includes(first)) return SHIFT_COLORS.afternoon.hex;
  if (first === 'ด') return SHIFT_COLORS.night.hex;
  if (['รO', 'รE'].includes(first)) return SHIFT_COLORS.dawn.hex;
  if (first === 'Ext') return SHIFT_COLORS.ext.hex;
  if (first === 'SMC') return SHIFT_COLORS.smc.hex;
  return '#FFFFFF';
}

export const THAI_DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const PREGNANCY_LABELS: Record<string, string> = {
  early: 'ตั้งครรภ์ระยะแรก',
  mid: 'ตั้งครรภ์ระยะกลาง',
  late: 'ตั้งครรภ์ระยะปลาย',
  postpartum: 'หลังคลอด',
};
