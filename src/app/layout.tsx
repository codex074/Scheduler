import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { QueryProvider } from '@/components/QueryProvider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'จัดตารางเวรห้องยา',
  description: 'ระบบช่วยจัดตารางเวรห้องยาโรงพยาบาลรายเดือน',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans">
        <QueryProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-x-auto">
              <div className="px-6 py-6 max-w-[1600px] mx-auto">{children}</div>
            </main>
          </div>
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
