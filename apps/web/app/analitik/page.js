'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, ErrorBox, PageHeader, Spinner } from '../../components/ui';
import {
  apiKehadiran, apiDudiTerbaik, apiNilaiTertinggi, apiTerajin,
  apiBermasalah, apiTeraktif, apiExportUrl,
} from '../../lib/api';

export default function AnalitikPage() {
  const [hadir, setHadir] = useState(null);
  const [dudi, setDudi] = useState([]);
  const [nilai, setNilai] = useState([]);
  const [rajin, setRajin] = useState([]);
  const [warn, setWarn] = useState([]);
  const [feed, setFeed] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [h, d, n, r, w, f] = await Promise.all([
          apiKehadiran({}), apiDudiTerbaik({ limit: 10 }), apiNilaiTertinggi({ limit: 10 }),
          apiTerajin({ limit: 10 }), apiBermasalah({ limit: 50 }), apiTeraktif({ limit: 20 }),
        ]);
        setHadir(h); setDudi(d.data || []); setNilai(n.data || []);
        setRajin(r.data || []); setWarn(w.data || []); setFeed(f.data || []);
      } catch (e) { setErr(`${e.message} — pastikan sudah login.`); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <AppShell title="Rekap Analitik">
      <PageHeader title="Rekap Analitik" sub="Insight kehadiran, peringkat, early warning, dan feed." actions={<>
        {['jurnal', 'presensi', 'penempatan'].map((t) => (
          <a key={t} href={apiExportUrl(t)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">CSV {t}</a>
        ))}
        <button onClick={() => window.print()} className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white">Cetak PDF</button>
      </>} />
      <ErrorBox message={err} />
      {loading && <Spinner />}

      <Card>
        <h3 className="font-semibold">1 · Kehadiran & Kesehatan <span className="text-xs font-normal text-slate-500">(30 hari)</span></h3>
        {hadir ? (
          <div className="mt-2 text-sm">
            <p>Total {hadir.total} record · HADIR {hadir.pct?.HADIR ?? 0}% · IZIN {hadir.pct?.IZIN ?? 0}% · SAKIT {hadir.pct?.SAKIT ?? 0}% · ALPHA {hadir.pct?.ALPHA ?? 0}%</p>
            <Bar label="HADIR" v={hadir.pct?.HADIR} c="bg-emerald-500" />
            <Bar label="SAKIT" v={hadir.pct?.SAKIT} c="bg-amber-500" />
            <Bar label="ALPHA" v={hadir.pct?.ALPHA} c="bg-red-500" />
            <p className="mt-2 text-xs text-slate-500">Kesehatan — SEHAT {hadir.byKondisi?.SEHAT ?? 0} · RINGAN {hadir.byKondisi?.SAKIT_RINGAN ?? 0} · BERAT {hadir.byKondisi?.BUTUH_PENANGANAN ?? 0}</p>
          </div>
        ) : !loading && <p className="text-sm text-slate-400">Tidak ada data.</p>}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <RankTable title="2 · DUDI Terbaik" rows={dudi} cols={[['nama', 'DUDI'], ['skor', 'Skor'], ['avgNilai', 'Avg']]} />
        <RankTable title="3 · Siswa Nilai Tertinggi" rows={nilai} cols={[['siswa', 'Siswa'], ['avgNilai', 'Avg'], ['jumlahDinilai', 'N']]} />
        <RankTable title="4 · Siswa Terajin" rows={rajin} cols={[['siswa', 'Siswa'], ['skor', 'Skor'], ['hadirPct', 'Hadir%']]} />
        <Card>
          <h3 className="font-semibold">5 · Early Warning <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${warn.length ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{warn.length}</span></h3>
          <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto text-sm">
            {warn.slice(0, 15).map((w) => <li key={w.penempatanId} className="rounded-xl bg-red-50 px-3 py-1.5"><b>{w.siswa}</b> @ {w.dudi}<br /><span className="text-xs text-red-700">{w.reasons.join(' · ')}</span></li>)}
            {!warn.length && !loading && <li className="text-slate-400">Tidak ada flag. Aman. ✅</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-semibold">6 · Jurnal Teraktif</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {feed.map((j) => <div key={j.id} className="rounded-xl border border-slate-200 p-2.5 text-sm hover:border-indigo-300"><b>#{j.id}</b> {j.penempatan?.siswa?.nama} — {j.deskripsi?.slice(0, 90)} <span className="text-xs text-slate-500">({j.statusVerifikasi}/{j.nilaiGuru ?? '–'})</span></div>)}
          {!feed.length && !loading && <p className="text-sm text-slate-400">Belum ada jurnal.</p>}
        </div>
      </Card>
    </AppShell>
  );
}

function Bar({ label, v = 0, c }) {
  return (
    <div className="mt-1.5 flex items-center gap-2 text-xs">
      <span className="w-14 font-medium">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-2.5 rounded-full ${c}`} style={{ width: `${Math.min(100, v)}%` }} /></div>
      <span className="w-12 text-right font-semibold">{v}%</span>
    </div>
  );
}

function RankTable({ title, rows, cols }) {
  return (
    <Card className="p-0">
      <h3 className="px-4 pt-4 font-semibold">{title}</h3>
      {rows.length ? (
        <table className="mt-2 w-full text-sm">
          <thead><tr className="border-y bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">{cols.map(([k, l]) => <th key={k} className="px-4 py-2">{l}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i} className="border-b last:border-0 hover:bg-slate-50">{cols.map(([k]) => <td key={k} className="px-4 py-2">{String(r[k] ?? '–').slice(0, 40)}</td>)}</tr>)}</tbody>
        </table>
      ) : <p className="px-4 pb-4 text-sm text-slate-400">Belum ada data.</p>}
    </Card>
  );
}
