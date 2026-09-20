'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiLogin } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!/.+@.+\..+/.test(email)) return setErr('Isi email yang valid (contoh: nama@sekolah.id).');
    if (password.length < 6) return setErr('Password minimal 6 karakter.');
    setLoading(true);
    try {
      const data = await apiLogin(email.trim(), password);
      if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data?.user) localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (e) {
      setErr(e.message || 'Login gagal. Periksa email & password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 font-bold text-white">PK</span>
          <div>
            <p className="font-bold leading-tight">Jurnal Digital PKL</p>
            <p className="text-xs text-slate-500">SMKN 1 Kras</p>
          </div>
        </div>
        <h1 className="mt-6 text-xl font-bold">Masuk</h1>
        <p className="text-sm text-slate-500">Gunakan akun yang diberikan administrator.</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="nama@sekolah.id" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {err && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
          <p className="pt-1 text-center text-sm">
            <a href="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-800">Lupa password?</a>
          </p>
        </form>
      </div>
    </main>
  );
}
