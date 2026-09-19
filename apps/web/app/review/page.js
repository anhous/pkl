'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, ErrorBox, PageHeader, Spinner, btnPrimary, inputCls } from '../../components/ui';
import { apiJurnalList, apiJurnalNilai } from '../../lib/api';

export default function ReviewPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [nilai, setNilai] = useState({ nilaiGuru: 85, catatanGuru: '', statusVerifikasi: 'DISETUJUI' });

  async function reload(s) {
    setLoading(true);
    try { setRows((await apiJurnalList({ status: s || undefined, limit: 30 })).data || []); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(status); }, [status]);

  async function save() {
    try {
      await apiJurnalNilai(editing, { ...nilai, nilaiGuru: Number(nilai.nilaiGuru) });
      setEditing(null);
      reload(status);
    } catch (e) { setErr(e.message); }
  }

  return (
    <AppShell title="Review Guru">
      <PageHeader title="Review / Penilaian Guru" sub="Nilai 1–100 + catatan untuk jurnal bimbingan." actions={
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
          <option value="">Semua status</option>
          <option>MENUNGGU</option><option>DIPERIKSA</option><option>DISETUJUI</option><option>REVISI</option>
        </select>
      } />
      <ErrorBox message={err} />
      <Card className="overflow-x-auto p-0">
        {loading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">ID</th><th className="px-4 py-3">Siswa / DUDI</th><th className="px-4 py-3">Deskripsi</th><th className="px-4 py-3">Nilai</th><th className="px-4 py-3">Aksi</th></tr></thead>
            <tbody>
              {rows.map((j) => (
                <tr key={j.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{j.id}</td>
                  <td className="px-4 py-2.5"><b>{j.penempatan?.siswa?.nama}</b><br /><span className="text-xs text-slate-500">@ {j.penempatan?.dudi?.nama}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{j.deskripsi?.slice(0, 80)}</td>
                  <td className="px-4 py-2.5"><b>{j.nilaiGuru ?? '–'}</b> <span className="text-xs text-slate-500">({j.statusVerifikasi})</span></td>
                  <td className="px-4 py-2.5"><button onClick={() => { setEditing(j.id); setNilai({ nilaiGuru: j.nilaiGuru || 85, catatanGuru: j.catatanGuru || '', statusVerifikasi: 'DISETUJUI' }); }} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Nilai</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Nilai jurnal #{editing}</h3>
            <label className="mb-1 mt-3 block text-xs font-semibold uppercase text-slate-500">Nilai (1–100)</label>
            <input type="number" min={1} max={100} value={nilai.nilaiGuru} onChange={(e) => setNilai({ ...nilai, nilaiGuru: e.target.value })} className={inputCls} />
            <label className="mb-1 mt-3 block text-xs font-semibold uppercase text-slate-500">Catatan evaluasi</label>
            <textarea value={nilai.catatanGuru} onChange={(e) => setNilai({ ...nilai, catatanGuru: e.target.value })} className={inputCls} rows={3} />
            <label className="mb-1 mt-3 block text-xs font-semibold uppercase text-slate-500">Status</label>
            <select value={nilai.statusVerifikasi} onChange={(e) => setNilai({ ...nilai, statusVerifikasi: e.target.value })} className={inputCls}>
              <option>DIPERIKSA</option><option>DISETUJUI</option><option>REVISI</option><option>MENUNGGU</option>
            </select>
            <div className="mt-4 flex gap-2">
              <button onClick={save} className={`${btnPrimary} flex-1 py-2`}>Simpan</button>
              <button onClick={() => setEditing(null)} className="flex-1 rounded-xl bg-slate-200 py-2 text-sm font-medium">Batal</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
