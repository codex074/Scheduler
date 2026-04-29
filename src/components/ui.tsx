'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
}>(function Button({ className, variant = 'primary', size = 'md', ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100',
        className,
      )}
    />
  );
});

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm',
          'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none',
          className,
        )}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={cn(
          'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm',
          'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none',
          className,
        )}
      />
    );
  },
);

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-white rounded-lg border border-slate-200 shadow-sm', className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('block text-sm font-medium text-slate-700 mb-1', className)} {...props} />;
}

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue' }) {
  const palette: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
  };
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', palette[color])}>{children}</span>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
