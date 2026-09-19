'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, Empty, ErrorBox, PageHeader, Spinner } from '../../components/ui';
import { apiPenempatanList } from '../../lib/api';

const STATUS_CLS = { AKTIF: 'bg-emerald-100 text-emerald-700', SELESAI: 'bg-slate-200 text-slate-600', BATAL: 'bg-red-100 text-red-700' };

export default function PenempatanPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPenempatanList({ limit: 20 })
      .then((d) => setRows(d.data || []))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Penempatan PKL">
      <PageHeader title="Penempatan PKL" sub="Relasi Siswa ↔ DUDI ↔ Guru. Dibuat oleh admin." />
      <ErrorBox message={err} />
      <Card className="overflow-x-auto p-0">
        {loading ? <Spinner /> : rows.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">ID</th><th className="px-4 py-3">Siswa</th><th className="px-4 py-3">DUDI</th><th className="px-4 py-3">Guru</th><th className="px-4 py-3">Periode</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-2.5 font-medium">{r.siswa?.nama || `#${r.siswaId}`}</td>
                  <td className="px-4 py-2.5">{r.dudi?.nama || `#${r.dudiId}`}</td>
                  <td className="px-4 py-2.5">{r.guru?.nama || '–'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{String(r.tanggalMulai).slice(0, 10)} → {String(r.tanggalSelesai).slice(0, 10)}</td>
                  <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[r.status] || 'bg-slate-200'}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-4"><Empty label="Belum ada penempatan." /></div>}
      </Card>
    </AppShell>
  );
}
