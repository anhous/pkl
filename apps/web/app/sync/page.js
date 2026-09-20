'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { Card, ErrorBox, OkBox, PageHeader, btnPrimary } from '../../components/ui';
import { apiSyncStatus, apiSyncPull, apiSyncPush, apiSyncLogs, apiSyncSettings, apiSyncSettingsPut, apiSyncSchedulerReload, apiMe } from '../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function SyncPage() {
  const [st, setSt] = useState(null);
  const [logs, setLogs] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [role, setRole] = useState('');
  const [cfg, setCfg] = useState({ baseUrl: '', username: '', password: '', apiKey: '', webhookSecret: '', syncEnabled: false, pullCron: '0 2 * * *', pushCron: '5 * * * *' });
  const [cfgInfo, setCfgInfo] = useState('');

  async function reload() {
    try {
      setSt(await apiSyncStatus());
      setLogs((await apiSyncLogs({ limit: 20 })).data || []);
      const s = await apiSyncSettings();
      setCfg((c) => ({ ...c, baseUrl: s.baseUrl || '', username: s.username || '', pullCron: s.pullCron || c.pullCron, pushCron: s.pushCron || c.pushCron, syncEnabled: !!s.syncEnabled }));
      setCfgInfo(`password:${s.passwordSet ? 'terisi' : 'kosong'} · apiKey:${s.apiKeySet ? 'terisi' : 'kosong'} · webhook:${s.webhookSecretSet ? 'terisi' : 'kosong'}`);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => {
    reload();
    apiMe().then((d) => setRole(d.user?.role || '')).catch(() => {});
  }, []);

  async function act(label, fn) {
    setBusy(label); setMsg(''); setErr('');
    try { const r = await fn(); setMsg(r.message || JSON.stringify(r).slice(0, 200)); reload(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setBusy('save'); setMsg(''); setErr('');
    try {
      const body = {
        SDMS_BASE_URL: cfg.baseUrl.trim(),
        SDMS_USERNAME: cfg.username.trim(),
        SDMS_PULL_CRON: cfg.pullCron.trim(),
        SDMS_PUSH_CRON: cfg.pushCron.trim(),
        SDMS_SYNC_ENABLED: cfg.syncEnabled,
      };
      if (cfg.password) body.SDMS_PASSWORD = cfg.password;
      if (cfg.apiKey) body.SDMS_API_KEY = cfg.apiKey;
      if (cfg.webhookSecret) body.SDMS_WEBHOOK_SECRET = cfg.webhookSecret;
      const r = await apiSyncSettingsPut(body);
      setMsg(r.message || 'Tersimpan.');
      setCfg((c) => ({ ...c, password: '', apiKey: '', webhookSecret: '' }));
      reload();
    } catch (e) { setErr(e.message); }
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

      <h3 className="mb-2 mt-6 font-semibold">Pengaturan SDMS {role !== 'SUPERADMIN' && <span className="text-xs font-normal text-slate-500">(hanya SUPERADMIN yang bisa menyimpan)</span>}</h3>
      <Card>
        <form onSubmit={saveSettings} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Base URL
            <input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} disabled={role !== 'SUPERADMIN'}
              placeholder="http://sdms.smkn1kras.sch.id" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400" />
          </label>
          <label className="text-sm">Username
            <input value={cfg.username} onChange={(e) => setCfg({ ...cfg, username: e.target.value })} disabled={role !== 'SUPERADMIN'}
              placeholder="akun integrasi SDMS" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-sm">Password <span className="text-xs text-slate-400">(kosongkan = tidak berubah)</span>
            <input type="password" value={cfg.password} onChange={(e) => setCfg({ ...cfg, password: e.target.value })} disabled={role !== 'SUPERADMIN'}
              placeholder="••••••••" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          </label>
          <label className="text-sm">API Key (X-API-Key) <span className="text-xs text-slate-400">(kosongkan = tidak berubah)</span>
            <input value={cfg.apiKey} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} disabled={role !== 'SUPERADMIN'}
              placeholder="dari Application Hub" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400" />
          </label>
          <label className="text-sm">Webhook secret (HMAC) <span className="text-xs text-slate-400">(kosongkan = tidak berubah)</span>
            <input value={cfg.webhookSecret} onChange={(e) => setCfg({ ...cfg, webhookSecret: e.target.value })} disabled={role !== 'SUPERADMIN'}
              placeholder="samakan dengan Hub" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Pull cron
              <input value={cfg.pullCron} onChange={(e) => setCfg({ ...cfg, pullCron: e.target.value })} disabled={role !== 'SUPERADMIN'}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400" />
            </label>
            <label className="text-sm">Push cron
              <input value={cfg.pushCron} onChange={(e) => setCfg({ ...cfg, pushCron: e.target.value })} disabled={role !== 'SUPERADMIN'}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cfg.syncEnabled} onChange={(e) => setCfg({ ...cfg, syncEnabled: e.target.checked })} disabled={role !== 'SUPERADMIN'} />
            Scheduler otomatis aktif
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            {role === 'SUPERADMIN' && (
              <button disabled={!!busy} className={`${btnPrimary} disabled:opacity-50`}>{busy === 'save' ? '…' : 'Simpan pengaturan'}</button>
            )}
            {role === 'SUPERADMIN' && (
              <button type="button" disabled={!!busy} onClick={() => act('sched', apiSyncSchedulerReload)} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'sched' ? '…' : 'Muat ulang scheduler'}
              </button>
            )}
            <span className="text-xs text-slate-500">{cfgInfo}</span>
          </div>
        </form>
      </Card>

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
