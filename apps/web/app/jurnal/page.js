'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, Empty, ErrorBox, OkBox, PageHeader, btnPrimary, inputCls } from '../../components/ui';
import { apiJurnalList, apiJurnalCreate, apiPenempatanList, apiPresensiCreate } from '../../lib/api';

const VERIF_CLS = { MENUNGGU: 'bg-amber-100 text-amber-700', DIPERIKSA: 'bg-sky-100 text-sky-700', DISETUJUI: 'bg-emerald-100 text-emerald-700', REVISI: 'bg-red-100 text-red-700' };

export default function JurnalPage() {
  const [placements, setPlacements] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ penempatanId: '', tanggal: '', jamMulai: '08:00', jamSelesai: '16:00', deskripsi: '' });
  const [foto, setFoto] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  async function reload(pid) {
    try { setRows((await apiJurnalList(pid ? { penempatanId: pid } : { limit: 20 })).data || []); }
    catch (e) { setErr(e.message); }
  }
  useEffect(() => {
    apiPenempatanList({ limit: 50 }).then((d) => {
      setPlacements(d.data || []);
      const first = (d.data || [])[0]?.id;
      if (first) { setForm((f) => ({ ...f, penempatanId: String(first) })); reload(first); }
    }).catch((e) => setErr(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setOk('');
    if (form.deskripsi.trim().length < 10) return setErr('Deskripsi minimal 10 karakter.');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (foto) fd.append('foto', foto);
      const created = await apiJurnalCreate(fd);
      setOk(`Jurnal #${created.id} tersimpan (${created.statusVerifikasi}).`);
      setForm((f) => ({ ...f, deskripsi: '' }));
      setFoto(null);
      reload(form.penempatanId);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <AppShell title="Jurnal Harian">
      <PageHeader title="Jurnal Harian" sub="Isi kegiatan harian + foto bukti. Optimal di HP." />
      <ErrorBox message={err} />
      <OkBox message={ok} />
      <Card>
        <form onSubmit={submit} className="space-y-3">
          <select value={form.penempatanId} onChange={(e) => { setForm({ ...form, penempatanId: e.target.value }); reload(e.target.value); }} className={inputCls}>
            {placements.map((p) => <option key={p.id} value={p.id}>#{p.id} {p.siswa?.nama} @ {p.dudi?.nama}</option>)}
          </select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className={inputCls} required />
            <input type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} className={inputCls} />
            <input type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} className={inputCls} />
          </div>
          <textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} placeholder="Deskripsi kegiatan (min 10 karakter)" className={inputCls} rows={3} required />
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFoto(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600" />
          <button disabled={saving} className={`${btnPrimary} w-full py-2.5`}>{saving ? 'Menyimpan...' : 'Simpan Jurnal'}</button>
        </form>
      </Card>

      <h3 className="mb-2 mt-6 font-semibold">Galeri + Status Verifikasi</h3>
      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((j) => (
            <Card key={j.id}>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-slate-500">{String(j.tanggal).slice(0, 10)} · {j.jamMulai}-{j.jamSelesai}</p>
                <span className="flex-1" />
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERIF_CLS[j.statusVerifikasi] || 'bg-slate-200'}`}>{j.statusVerifikasi}</span>
              </div>
              <p className="mt-1.5 text-sm">{j.deskripsi?.slice(0, 160)}</p>
              <p className="mt-1.5 text-xs text-slate-500">
                {j.fotoUrl && <a href={j.fotoUrl} target="_blank" className="mr-2 font-medium text-indigo-600 underline">📷 foto</a>}
                Nilai: <b className="text-slate-800">{j.nilaiGuru ?? '–'}</b>
              </p>
              {j.catatanGuru && <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">Catatan guru: {j.catatanGuru}</p>}
            </Card>
          ))}
        </div>
      ) : <Empty label="Belum ada jurnal." />}

      <Card className="mt-4">
        <h3 className="font-semibold">Presensi Cepat Hari Ini</h3>
        <QuickPresensi penempatanId={form.penempatanId} onDone={setOk} onErr={setErr} />
      </Card>
    </AppShell>
  );
}

function QuickPresensi({ penempatanId, onDone, onErr }) {
  async function send(statusKehadiran, kondisiKesehatan) {
    try {
      await apiPresensiCreate({ penempatanId: Number(penempatanId), tanggal: new Date().toISOString().slice(0, 10), statusKehadiran, kondisiKesehatan });
      onDone('Presensi tersimpan.');
    } catch (e) { onErr(e.message); }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => send('HADIR', 'SEHAT')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">HADIR / SEHAT</button>
      <button type="button" onClick={() => send('IZIN', 'SEHAT')} className="rounded-xl bg-slate-600 px-4 py-2 text-sm font-semibold text-white">IZIN</button>
      <button type="button" onClick={() => send('SAKIT', 'SAKIT_RINGAN')} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">SAKIT</button>
    </div>
  );
}
