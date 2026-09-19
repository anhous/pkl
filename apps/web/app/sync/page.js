'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, ErrorBox, OkBox, PageHeader, btnPrimary } from '../../components/ui';
import { apiSyncStatus, apiSyncPull, apiSyncPush, apiSyncLogs } from '../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SyncPage() {
  const [st, setSt] = useState(null);
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  async function reload() {
    try {
      setSt(await apiSyncStatus());
      setLogs((await apiSyncLogs({ limit: 20 })).data || []);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { reload(); }, []);

  async function act(label, fn) {
    setBusy(label); setMsg(''); setErr('');
    try { const r = await fn(); setMsg(r.message || JSON.stringify(r).slice(0, 200)); reload(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  }

  const liveCls = st?.sdms?.live === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';

  return (
    <AppShell title="Sync SDMS">
      <PageHeader title="Integrasi SDMS" sub="sdms.smkn1kras.sch.id · pull master · push jurnal · cron." />
      <ErrorBox message={err} />
      <OkBox message={msg} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h3 className="font-semibold">🔌 Koneksi</h3>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{st?.sdms?.baseUrl || '…'}</p>
          <p className="mt-2 text-sm">Konfigurasi: <b>{st?.sdms?.configured ? 'YA' : 'BELUM'}</b></p>
          <p className="mt-1 text-sm">Live: <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${liveCls}`}>{st?.sdms?.live || '–'}</span></p>
        </Card>
        <Card>
          <h3 className="font-semibold">⏰ Scheduler</h3>
          <p className="mt-2 text-sm">Aktif: <b>{st?.scheduler?.enabled ? 'YA' : 'TIDAK'}</b></p>
          <p className="mt-1 font-mono text-xs text-slate-500">pull {st?.scheduler?.pullCron || '–'}</p>
          <p className="font-mono text-xs text-slate-500">push {st?.scheduler?.pushCron || '–'}</p>
          <p className="mt-1 text-xs text-slate-500">lastPull {st?.scheduler?.lastPull || '–'} · lastPush {st?.scheduler?.lastPush || '–'}</p>
        </Card>
        <Card>
          <h3 className="font-semibold">▶️ Aksi Manual</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {['jurusan', 'siswa', 'guru'].map((e) => (
              <button key={e} disabled={!!busy} onClick={() => act(e, () => apiSyncPull(e))} className={`${btnPrimary} disabled:opacity-50`}>
                {busy === e ? '…' : `Pull ${e}`}
              </button>
            ))}
            <button disabled={!!busy} onClick={() => act('push', () => apiSyncPush(100))} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy === 'push' ? '…' : 'Push jurnal'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">DUDI/instruktur milik lokal (tidak ada di SDMS).</p>
        </Card>
      </div>

      <h3 className="mb-2 mt-6 font-semibold">Webhook SDMS → PKL (real-time)</h3>
      <Card>
        <p className="text-sm">Daftarkan URL ini di SDMS → Application Hub beserta events <span className="font-mono text-xs">siswa.*, guru.*, jurusan.*, bulk.sync</span>:</p>
        <p className="mt-1 break-all rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-emerald-300">{API_BASE}/webhooks/sdms</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={() => act('test', async () => (await fetch(`${API_BASE}/webhooks/sdms/test`).then((r) => r.json())))} disabled={!!busy}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === 'test' ? '…' : 'Test receiver'}</button>
          <span className="text-xs text-slate-500">Verifikasi HMAC-SHA256 via header X-API-Signature · secret: SDMS_WEBHOOK_SECRET (server).</span>
        </div>
      </Card>

      <h3 className="mb-2 mt-6 font-semibold">Sync Log (20 terbaru)</h3>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3">ID</th><th className="px-4 py-3">Sumber</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Pesan</th></tr></thead>
          <tbody>
            {logs.map((l) => <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50"><td className="px-4 py-2.5 font-mono text-xs">{l.id}</td><td className="px-4 py-2.5">{l.sourceApp}</td><td className="px-4 py-2.5"><StatusBadge s={l.status} /></td><td className="px-4 py-2.5 text-xs text-slate-500">{l.message?.slice(0, 120)}</td></tr>)}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}

function StatusBadge({ s }) {
  const cls = s === 'SUKSES' ? 'bg-emerald-100 text-emerald-700' : s === 'GAGAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{s}</span>;
}
