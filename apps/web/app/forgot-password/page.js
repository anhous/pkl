'use client';
import { useState } from 'react';
import { apiForgotPassword } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    if (!/.+@.+\..+/.test(email)) return setErr('Isi email yang valid (contoh: nama@sekolah.id).');
    setLoading(true);
    try {
      const data = await apiForgotPassword(email.trim());
      setMsg(data.message || 'Jika email terdaftar & aktif, link reset sudah dikirim.');
    } catch (e) {
      setErr(e.message || 'Gagal meminta reset. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-8 shadow-xl">
        <p className="font-bold leading-tight">Lupa password</p>
        <p className="mt-1 text-sm text-slate-500">Masukkan email akun. Kalau terdaftar, link reset (berlaku 60 menit, sekali pakai) dikirim ke email.</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="nama@sekolah.id" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          {err && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          {msg && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Mengirim...' : 'Kirim link reset'}
          </button>
          <p className="pt-1 text-center text-sm">
            <a href="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">Kembali masuk</a>
          </p>
        </form>
      </div>
    </main>
  );
}
