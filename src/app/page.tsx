import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card } from '@/components/ui';
import { THAI_MONTH_NAMES } from '@/lib/constants';
import { Users, CalendarDays, ClipboardList, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [memberCount, holidayCount, scheduleCount, currentMonth] = await Promise.all([
    prisma.teamMember.count({ where: { isActive: true } }),
    prisma.publicHoliday.count(),
    prisma.schedule.count(),
    prisma.schedule.findUnique({
      where: { year_month: { year, month } },
      include: { _count: { select: { assignments: true } } },
    }),
  ]);

  const stats = [
    { label: 'จำนวนทีม', value: memberCount, href: '/team', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'วันหยุดที่บันทึก', value: holidayCount, href: '/holidays', icon: CalendarDays, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'ตารางที่จัดแล้ว', value: scheduleCount, href: '/schedules', icon: ClipboardList, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">หน้าหลัก</h1>
        <p className="text-sm text-slate-500 mt-1">ภาพรวมระบบจัดตารางเวรห้องยา</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 hover:shadow-md transition cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">{s.label}</div>
                  <div className="text-3xl font-bold mt-2">{s.value}</div>
                </div>
                <div className={`p-2 rounded-lg ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">ตารางเดือนปัจจุบัน</div>
            <div className="text-xl font-semibold mt-1">
              {THAI_MONTH_NAMES[month - 1]} {year + 543}
            </div>
            {currentMonth ? (
              <div className="text-sm text-slate-500 mt-1">
                {currentMonth._count.assignments} เวร • สถานะ:{' '}
                {currentMonth.status === 'finalized' ? 'ปิดตารางแล้ว' : 'ฉบับร่าง'}
              </div>
            ) : (
              <div className="text-sm text-slate-500 mt-1">ยังไม่ได้จัดตารางเดือนนี้</div>
            )}
          </div>
          <Link
            href={`/schedules/${year}/${month}`}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            {currentMonth ? 'ดูตาราง' : 'จัดตาราง'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">เริ่มต้นใช้งาน</h2>
        <ol className="text-sm text-slate-600 space-y-1 list-decimal pl-5">
          <li>เพิ่มทีมงานในเมนู &quot;ทีมงาน&quot;</li>
          <li>เพิ่มวันหยุดราชการของปีในเมนู &quot;วันหยุด&quot;</li>
          <li>ไปที่ &quot;ตารางเวร&quot; แล้วกด &quot;สร้างตารางใหม่&quot;</li>
          <li>ตรวจสอบ/แก้ไขตาราง แล้ว Export Excel</li>
        </ol>
      </Card>
    </div>
  );
}
