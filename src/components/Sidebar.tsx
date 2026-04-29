'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CalendarDays, ClipboardList, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'หน้าหลัก', icon: Home },
  { href: '/team', label: 'ทีมงาน', icon: Users },
  { href: '/holidays', label: 'วันหยุด', icon: CalendarDays },
  { href: '/schedules', label: 'ตารางเวร', icon: ClipboardList },
  { href: '/history', label: 'ประวัติ', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="text-lg font-bold leading-tight">ตารางเวรห้องยา</div>
        <div className="text-xs text-slate-400 mt-1">Pharmacy Scheduler</div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm transition',
                active ? 'bg-slate-800 text-white border-l-2 border-blue-400' : 'text-slate-300 hover:bg-slate-800/60',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-500">v0.1.0</div>
    </aside>
  );
}
