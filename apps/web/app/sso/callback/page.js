'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SSOCallbackPage() {
  const router  = useRouter();
  const [msg,   setMsg]   = useState('Memproses login SSO...');
  const [error, setError] = useState('');
  const [done,  setDone]  = useState(false);

  useEffect(() => {
    // Baca token dari URL hash: /sso/callback#at=...&rt=...&role=...
    // Hash tidak dikirim ke server — aman untuk token
    const hash   = window.location.hash.slice(1); // hapus '#'
    const params = new URLSearchParams(hash);

    const at   = params.get('at');
    const rt   = params.get('rt');
    const role = params.get('role');
    const err  = params.get('error');

    // Fallback: coba baca dari query string juga (untuk backward compat)
    const qp  = new URLSearchParams(window.location.search);
    const qAt = qp.get('accessToken') || qp.get('at');
    const qRt = qp.get('refreshToken') || qp.get('rt');
    const qRole = qp.get('role');
    const qErr  = qp.get('error');

    const accessToken  = at  || qAt;
    const refreshToken = rt  || qRt;
    const userRole     = role || qRole;
    const errMsg       = err || qErr;

    if (errMsg) {
      const map = {
        sso_expired:  'Sesi SSO kadaluarsa. Kembali ke SDMS dan coba lagi.',
        sso_invalid:  'Token SSO tidak valid.',
        sso_inactive: 'Akun Anda tidak aktif.',
        sso_error:    'Terjadi kesalahan SSO.',
      };
      setError(map[errMsg] || 'Login gagal: ' + errMsg);
      setDone(true);
      return;
    }

    if (!accessToken) {
      setError('Token tidak ditemukan. Kembali ke SDMS dan coba lagi.');
      setDone(true);
      return;
    }

    // Simpan ke localStorage
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (userRole)     localStorage.setItem('userRole', userRole);

    // Bersihkan hash dari URL
    window.history.replaceState(null, '', window.location.pathname);

    setMsg('Login berhasil! Mengalihkan...');
    setDone(true);
    setTimeout(() => router.replace('/dashboard'), 600);
  }, [router]);

  return (
    <main style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg,#eef2ff,#f8fafc,#ecfdf5)',
      padding: '1rem', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px', background: '#fff',
        borderRadius: '1.5rem', border: '1px solid #e2e8f0',
        padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '0.75rem',
            background: '#4f46e5', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem',
          }}>PK</div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>Jurnal Digital PKL</p>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.75rem' }}>SMKN 1 Kras</p>
          </div>
        </div>

        {error ? (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Login Gagal</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>
            <a href="/login" style={{
              display: 'block', padding: '0.625rem 1rem', borderRadius: '0.75rem',
              background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: '0.875rem',
              textDecoration: 'none',
            }}>Login Manual</a>
          </>
        ) : (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#ede9fe', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <svg style={{ width: '28px', height: '28px', color: '#4f46e5', animation: 'spin 1s linear infinite' }}
                viewBox="0 0 24 24" fill="none">
                <circle opacity=".25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path opacity=".75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Masuk via SDMS</h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{msg}</p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
