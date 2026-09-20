'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { apiChangeEmail, apiChangePassword, apiMe } from '../../lib/api';

export default function AkunPage() {
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [cur, setCur] = useState('');
  const [npw, setNpw] = useState('');
  const [npw2, setNpw2] = useState('');
  const [msgPw, setMsgPw] = useState('');
  const [errPw, setErrPw] = useState('');
  const [msgEm, setMsgEm] = useState('');
  const [errEm, setErrEm] = useState('');

  useEffect(() => {
    apiMe().then((d) => { setEmail(d.user.email); setNewEmail(d.user.email); }).catch(() => {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (raw) { const u = JSON.parse(raw); setEmail(u.email); setNewEmail(u.email); }
    });
  }, []);

  async function gantiPassword(e) {
    e.preventDefault();
    setErrPw('');
    setMsgPw('');
    if (npw.length < 8) return setErrPw('Password baru minimal 8 karakter.');
    if (npw !== npw2) return setErrPw('Ulangi password baru tidak sama.');
    try {
      const r = await apiChangePassword(cur, npw);
      setMsgPw(r.message || 'Password berhasil diubah.');
      setCur('');
      setNpw('');
      setNpw2('');
    } catch (e) {
      setErrPw(e.message || 'Gagal mengganti password.');
    }
  }

  async function gantiEmail(e) {
    e.preventDefault();
    setErrEm('');
    setMsgEm('');
    if (!/.+@.+\..+/.test(newEmail)) return setErrEm('Isi email baru yang valid.');
    try {
      const r = await apiChangeEmail(newEmail.trim());
      setMsgEm(`Email sekarang: ${r.email}`);
      setEmail(r.email);
      localStorage.setItem('user', JSON.stringify(r));
    } catch (e) {
      setErrEm(e.message || 'Gagal mengganti email.');
    }
  }

  return (
    <AppShell title="Akun Saya">
      <div className="grid max-w-2xl gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="font-bold">Ganti password</p>
          <p className="mt-1 text-sm text-slate-500">Masuk: {email || '...'}. Token reset yang belum dipakai ikut hangus.</p>
          <form onSubmit={gantiPassword} className="mt-3 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              type="password" placeholder="Password lama" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              type="password" placeholder="Password baru (min 8)" value={npw} onChange={(e) => setNpw(e.target.value)} autoComplete="new-password" />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              type="password" placeholder="Ulangi password baru" value={npw2} onChange={(e) => setNpw2(e.target.value)} autoComplete="new-password" />
            {errPw && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errPw}</p>}
            {msgPw && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msgPw}</p>}
            <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Simpan password</button>
          </form>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="font-bold">Ganti email</p>
          <p className="mt-1 text-sm text-slate-500">Email dipakai untuk masuk + menerima link lupa password.</p>
          <form onSubmit={gantiEmail} className="mt-3 space-y-3">
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              placeholder="email.baru@sekolah.id" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="username" />
            {errEm && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errEm}</p>}
            {msgEm && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msgEm}</p>}
            <button className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Simpan email</button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
