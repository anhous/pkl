'use client';
import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import AppShell from '../../components/AppShell';
import { Card, ErrorBox, PageHeader } from '../../components/ui';
import { apiOverview, apiDudiMap } from '../../lib/api';
import { loadGoogleMaps, loadMarkerClusterer } from '../../lib/gmaps';

Chart.register(...registerables);
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

const STAT_STYLE = [
  'border-l-4 border-l-indigo-500',
  'border-l-4 border-l-emerald-500',
  'border-l-4 border-l-amber-500',
  'border-l-4 border-l-purple-500',
];

export default function DashboardPage() {
  const [ov, setOv] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const barRef = useRef(null);
  const donutRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([apiOverview(), apiDudiMap()])
      .then(([o, m]) => { setOv(o); setMapData(m.data || []); })
      .catch((e) => setErr(`${e.message} — pastikan sudah login.`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!ov?.distribusi?.length) return;
    const labels = ov.distribusi.map((d) => d.jurusan);
    const vals = ov.distribusi.map((d) => d.total);
    const charts = [];
    const c1 = barRef.current?.getContext('2d');
    const c2 = donutRef.current?.getContext('2d');
    if (c1) charts.push(new Chart(c1, { type: 'bar', data: { labels, datasets: [{ data: vals, backgroundColor: '#4f46e5', borderRadius: 6 }] }, options: { plugins: { legend: { display: false } }, responsive: true, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }));
    if (c2) charts.push(new Chart(c2, { type: 'doughnut', data: { labels, datasets: [{ data: vals, backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'] }] }, options: { responsive: true, cutout: '60%' } }));
    return () => charts.forEach((c) => c.destroy());
  }, [ov]);

  const stats = [
    { label: 'Siswa Aktif / Selesai', value: ov ? `${ov.siswaAktif} / ${ov.siswaSelesai}` : '–' },
    { label: 'Mitra DUDI', value: ov?.totalDudi ?? '–' },
    { label: 'Guru Pembimbing', value: ov?.totalGuru ?? '–' },
    { label: 'Penempatan Aktif', value: ov?.penempatanAktif ?? '–' },
  ];

  return (
    <AppShell title="Dashboard Eksekutif">
      <PageHeader title="Dashboard Eksekutif" sub="Ringkasan angka, sebaran jurusan, dan peta DUDI." />
      <ErrorBox message={err} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={s.label} className={STAT_STYLE[i % STAT_STYLE.length]}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '…' : s.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">Distribusi Siswa per Jurusan</h3>
          <p className="text-xs text-slate-500">Bar chart · Chart.js</p>
          {ov?.distribusi?.length ? <canvas ref={barRef} height={220} /> : <EmptyState loading={loading} label="Belum ada data siswa per jurusan." />}
        </Card>
        <Card>
          <h3 className="font-semibold">Komposisi Jurusan</h3>
          <p className="text-xs text-slate-500">Doughnut chart · Chart.js</p>
          {ov?.distribusi?.length ? <canvas ref={donutRef} height={220} /> : <EmptyState loading={loading} label="Belum ada data komposisi." />}
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-semibold">Peta Sebaran DUDI</h3>
        <p className="text-xs text-slate-500">Klik marker untuk detail lokasi, jumlah siswa, dan pembimbing.</p>
        <DudiMap data={mapData} />
      </Card>
    </AppShell>
  );
}

function EmptyState({ loading, label }) {
  return <p className="py-10 text-center text-sm text-slate-400">{loading ? 'Memuat…' : label}</p>;
}

function DudiMap({ data }) {
  const divRef = useRef(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!data.length || !divRef.current) return;
    const withCoord = data.filter((d) => d.latitude != null && d.longitude != null);
    if (!MAPS_KEY) {
      setStatus(`Mode list: ${data.length} DUDI (${withCoord.length} berkoordinat). Isi NEXT_PUBLIC_GOOGLE_MAPS_KEY untuk peta interaktif.`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const maps = await loadGoogleMaps(MAPS_KEY);
        if (cancelled) return;
        const center = withCoord.length ? { lat: withCoord[0].latitude, lng: withCoord[0].longitude } : { lat: -7.9, lng: 112.0 };
        const map = new maps.Map(divRef.current, { center, zoom: 11 });
        const info = new maps.InfoWindow();
        const markers = withCoord.map((d) => {
          const m = new maps.Marker({ position: { lat: d.latitude, lng: d.longitude }, map, title: d.nama });
          m.addListener('click', () => {
            info.setContent(`<div style="max-width:240px"><b>${esc(d.nama)}</b><br/>${esc(d.alamat)}<br/>Siswa PKL: <b>${d.jumlahSiswa}</b><br/>Pembimbing: ${esc(d.guru.join(', ') || '-')}<br/>Kuota: ${d.kuota}</div>`);
            info.open(map, m);
          });
          return m;
        });
        const lib = await loadMarkerClusterer().catch(() => null);
        if (lib?.MarkerClusterer && !cancelled) new lib.MarkerClusterer({ map, markers });
        setStatus(`${withCoord.length}/${data.length} DUDI tampil di peta`);
      } catch (e) { setStatus(e.message); }
    })();
    return () => { cancelled = true; };
  }, [data]);

  return (
    <div>
      {MAPS_KEY ? <div ref={divRef} className="mt-3 h-72 w-full rounded-xl bg-slate-100" /> : <div ref={divRef} className="hidden" />}
      {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-200 p-3 text-sm hover:border-indigo-300">
            <p className="font-semibold">{d.nama}</p>
            <p className="text-xs text-slate-500">{d.alamat}</p>
            <p className="mt-1 text-xs">Siswa: <b>{d.jumlahSiswa}</b> · Pembimbing: {d.guru.join(', ') || '–'}</p>
          </div>
        ))}
        {!data.length && <p className="text-sm text-slate-400">Belum ada DUDI. Tambahkan via Master Data.</p>}
      </div>
    </div>
  );
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
