'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, Empty, ErrorBox, PageHeader, Spinner, inputCls } from '../../components/ui';
import { apiList } from '../../lib/api';

const TABS = [
  { id: 'siswa', label: 'Siswa' },
  { id: 'guru', label: 'Guru' },
  { id: 'dudi', label: 'DUDI' },
  { id: 'jurusan', label: 'Jurusan' },
];

export default function MasterPage() {
  const [tab, setTab] = useState('siswa');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErr('');
    const t = setTimeout(() => {
      apiList(tab, { search, limit: 20 })
        .then((d) => { setRows(d.data || []); setMeta(d.meta || null); })
        .catch((e) => setErr(e.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [tab, search]);

  return (
    <AppShell title="Master Data">
      <PageHeader title="Master Data" sub="Siswa, guru, DUDI, dan jurusan. Tulis via admin." />
      <ErrorBox message={err} />
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border hover:border-indigo-300'}`}>{t.label}</button>
        ))}
      </div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Cari ${tab}...`} className={`${inputCls} mt-3`} />
      {meta && <p className="mt-2 text-xs text-slate-500">Total {meta.total} · halaman {meta.page}/{meta.totalPages}</p>}
      <Card className="mt-3 overflow-x-auto p-0">
        {loading ? <Spinner /> : rows.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">ID</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Detail</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.id}</td>
                  <td className="px-4 py-2.5 font-medium">{r.nama || r.kode || '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{JSON.stringify(pick(r)).slice(0, 120)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="p-4"><Empty /></div>}
      </Card>
    </AppShell>
  );
}

function pick(r) {
  const { id, nama, ...rest } = r;
  void id; void nama;
  return rest;
}
