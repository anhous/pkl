'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SSOCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState('Memproses SSO...');
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const role         = params.get('role');
    const errMsg       = params.get('error');

    if (errMsg) {
      const messages = {
        sso_expired:  'Sesi SSO kadaluarsa. Silakan kembali ke SDMS dan coba lagi.',
        sso_invalid:  'Token SSO tidak valid.',
        sso_inactive: 'Akun Anda tidak aktif.',
        sso_error:    'Terjadi kesalahan saat SSO. Silakan coba lagi.',
      };
      setError(messages[errMsg] || 'Login SSO gagal.');
      return;
    }

    if (!accessToken) {
      setError('Token tidak ditemukan. Silakan kembali ke SDMS.');
      return;
    }

    // Simpan token ke localStorage
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (role) localStorage.setItem('userRole', role);

    setStatus('Login berhasil! Mengalihkan...');

    // Redirect ke dashboard sesuai role
    const dashMap = {
      SISWA:          '/dashboard',
      PEMBIMBING:     '/dashboard',
      ADMIN_SEKOLAH:  '/dashboard',
      SUPERADMIN:     '/dashboard',
    };
    const dest = dashMap[role] || '/dashboard';
    setTimeout(() => router.replace(dest), 800);
  }, [params, router]);

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border bg-white p-8 shadow-xl text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 font-bold text-white text-lg">PK</span>
          <div className="text-left">
            <p className="font-bold leading-tight">Jurnal Digital PKL</p>
            <p className="text-xs text-slate-500">SMKN 1 Kras</p>
          </div>
        </div>

        {error ? (
          <div>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Login Gagal</h2>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <a href="/login"
              className="inline-block w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Login Manual
            </a>
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-indigo-600 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Masuk via SDMS</h2>
            <p className="text-sm text-slate-500">{status}</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center">
        <p className="text-slate-500">Memuat...</p>
      </main>
    }>
      <SSOCallbackContent />
    </Suspense>
  );
}
