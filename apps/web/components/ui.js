'use client';

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold sm:hidden">{title}</h2>
        <h2 className="hidden text-xl font-bold lg:hidden">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Spinner({ label = 'Memuat...' }) {
  return <p className="py-8 text-center text-sm text-slate-500 animate-pulse">{label}</p>;
}

export function Empty({ label = 'Belum ada data.' }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{label}</p>;
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{message}</p>;
}

export function OkBox({ message }) {
  if (!message) return null;
  return <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{message}</p>;
}

export const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
export const btnPrimary = 'rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50';
export const btnGhost = 'rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300';
