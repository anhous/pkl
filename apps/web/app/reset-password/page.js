'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { apiResetPassword } from '../../lib/api';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!token) return setErr('Token hilang. Buka lagi link dari email.');
    if (password.length < 8) return setErr('Password minimal 8 karakter.');
    if (password !== confirm) return setErr('Konfirmasi password tidak sama.');
    setLoading(true);
    try {
      const data = await apiResetPassword(token, password);
      setMsg(`${data.message || 'Password berhasil diubah.'} Mengalihkan ke login...`);
      setTimeout(() => router.push('/login'), 1500);
    } catch (e) {
      setErr(e.message || 'Token tidak valid atau kedaluwarsa. Minta link baru.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-8 shadow-xl">
        <p className="font-bold leading-tight">Buat password baru</p>
        <p className="mt-1 text-sm text-slate-500">Link hanya berlaku 60 menit dan sekali pakai.</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password baru</label>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              type="password" placeholder="Minimal 8 karakter" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Ulangi password</label>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              type="password" placeholder="Ulangi password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          {err && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          {msg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan password'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
