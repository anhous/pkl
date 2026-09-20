'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiMe } from '../lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'] },
  { href: '/master', label: 'Master Data', icon: '🗂️', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'] },
  { href: '/penempatan', label: 'Penempatan', icon: '🏢', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'] },
  { href: '/jurnal', label: 'Jurnal Harian', icon: '📝', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'SISWA'] },
  { href: '/review', label: 'Review Guru', icon: '✅', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'] },
  { href: '/analitik', label: 'Rekap Analitik', icon: '📈', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'] },
  { href: '/sync', label: 'Sync SDMS', icon: '🔄', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH'] },
  { href: '/akun', label: 'Akun Saya', icon: '👤', roles: ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'] },
];

const ROLE_BADGE = {
  SUPERADMIN: 'bg-purple-100 text-purple-700',
  ADMIN_SEKOLAH: 'bg-indigo-100 text-indigo-700',
  GURU: 'bg-emerald-100 text-emerald-700',
  SISWA: 'bg-sky-100 text-sky-700',
};

export default function AppShell({ children, title }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiMe()
      .then((d) => {
        setUser(d.user);
        localStorage.setItem('user', JSON.stringify(d.user));
      })
      .catch(() => {
        const raw = localStorage.getItem('user');
        if (raw) setUser(JSON.parse(raw));
        else if (pathname !== '/login') router.push('/login');
      });
  }, [pathname, router]);

  function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    router.push('/login');
  }

  const items = NAV.filter((n) => !user || n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white lg:hidden">
        <button onClick={() => setOpen(!open)} className="rounded-lg bg-slate-800 px-3 py-1.5" aria-label="Menu">☰</button>
        <span className="font-bold">Jurnal PKL</span>
        <span className="flex-1" />
        {user && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_BADGE[user.role] || 'bg-slate-200'}`}>{user.role}</span>}
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar */}
        <aside className={`${open ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden'} w-60 shrink-0 flex-col bg-slate-900 text-slate-200 lg:sticky lg:top-0 lg:flex lg:h-screen`}>
          <div className="flex items-center gap-2 px-5 pb-5 pt-6">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-bold text-white">PK</span>
            <div>
              <p className="font-bold leading-tight text-white">Jurnal PKL</p>
              <p className="text-[11px] text-slate-400">SMKN 1 Kras</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 lg:hidden">✕</button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            {items.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/');
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                  <span>{n.icon}</span>{n.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-800 p-4">
            <p className="truncate text-sm font-medium text-white">{user?.email || '...'}</p>
            {user && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${ROLE_BADGE[user.role] || 'bg-slate-700 text-white'}`}>{user.role}</span>}
            <button onClick={logout} className="mt-3 w-full rounded-xl bg-slate-800 py-2 text-sm text-slate-200 hover:bg-slate-700">Keluar</button>
          </div>
        </aside>
        {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" />}

        {/* Konten */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 hidden items-center gap-3 border-b bg-white/90 px-6 py-3 backdrop-blur lg:flex">
            <h1 className="text-lg font-bold">{title}</h1>
            <span className="flex-1" />
            {user && <span className="text-sm text-slate-500">{user.email}</span>}
            {user && <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE[user.role] || 'bg-slate-200'}`}>{user.role}</span>}
          </header>
          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
