'use strict';
const { parsePagination, buildMeta, parseId } = require('../../utils/pagination');
const env = require('../../config/env');
const svc = require('./sync.service');
const engine = require('./sync.engine');
const { schedulerStatus, startScheduler } = require('./sync.scheduler');
const { getSyncSettings, updateSyncSettings, effectiveSyncEnv, makeClientFromDb } = require('./settings');

async function makeClient(prisma) {
  return makeClientFromDb(prisma);
}

function makeClient() {
  return new SdmsClient({
    baseUrl: env.sdmsBaseUrl,
    username: env.sdmsUsername,
    password: env.sdmsPassword,
    apiKey: env.sdmsApiKey,
  });
}

async function list(req, res, next) {
  try {
    const { page, limit, order, skip } = parsePagination(req.query);
    const { total, data } = await svc.listLogs(req.prisma, {
      skip, take: limit, order,
      sourceApp: req.query.sourceApp || undefined,
      status: ['BERJALAN', 'SUKSES', 'GAGAL'].includes(req.query.status) ? req.query.status : undefined,
    });
    res.json({ data, meta: buildMeta({ page, limit, total }) });
  } catch (e) { next(e); }
}

async function detail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const row = await req.prisma.syncLog.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ message: 'Tidak ditemukan' });
    res.json(row);
  } catch (e) { next(e); }
}

async function run(req, res, next) {
  try {
    const log = await svc.runManualSync(req.prisma, { entity: req.params.entity, ...req.validated });
    res.status(201).json(log);
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

// Status konektor SDMS + scheduler + log terakhir (tanpa membocorkan password).
async function status(req, res, next) {
  try {
    const client = await makeClient(req.prisma);
    let live = null;
    if (client.configured) {
      try {
        await client.testJurnal();
        live = 'OK';
      } catch (e) {
        // 401 = endpoint ada tapi kredensial salah; selain itu = SDMS/gejala jaringan.
        live = e.status === 401 ? 'AUTH_GAGAL' : `ERROR:${e.message}`.slice(0, 200);
      }
    }
    const [lastSdms, lastPkl] = await Promise.all([
      engine.lastLogsBySource(req.prisma, 'SDMS', 3),
      engine.lastLogsBySource(req.prisma, 'PKL', 3),
    ]);
    res.json({
      sdms: {
        baseUrl: env.sdmsBaseUrl,
        configured: client.configured,
        live,
        entities: Object.keys(engine.SDMS_PULL_ENTITIES),
        localOnly: ['dudi', 'instruktur'],
      },
      scheduler: schedulerStatus(),
      lastLogs: { sdms: lastSdms, pkl: lastPkl },
    });
  } catch (e) { next(e); }
}

// POST /sync/:entity/pull — tarik real dari SDMS (jurusan/siswa/guru).
async function pull(req, res, next) {
  try {
    const log = await engine.pullEntity(req.prisma, await makeClient(req.prisma), req.params.entity);
    res.status(201).json(log);
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

// POST /sync/jurnal/push — dorong jurnal ke gateway SDMS.
async function push(req, res, next) {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.body?.limit, 10) || 100));
    const log = await engine.pushJurnal(req.prisma, await makeClient(req.prisma), { limit, since: req.body?.since });
    res.status(201).json(log);
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

async function settingsGet(req, res, next) {
  try {
    res.json(await getSyncSettings(req.prisma));
  } catch (e) { next(e); }
}

async function settingsPut(req, res, next) {
  try {
    const saved = await updateSyncSettings(req.prisma, req.validated);
    res.json({ message: 'Pengaturan SDMS tersimpan.', settings: saved });
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

// Muat ulang scheduler dari pengaturan DB tanpa restart PM2.
// Hanya instance pemilik jadwal (NODE_APP_INSTANCE=0) yang menjalankan cron.
async function schedulerReload(req, res, next) {
  try {
    const isOwner = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
    if (!isOwner) return res.json({ reloaded: false, message: 'Bukan instance pemilik jadwal.' });
    const eff = await effectiveSyncEnv(req.prisma);
    const { prisma } = require('../../config/db');
    startScheduler({ prisma, makeClient: () => makeClientFromDb(prisma), env: eff });
    res.json({ reloaded: true, scheduler: require('./sync.scheduler').schedulerStatus() });
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

module.exports = { list, detail, run, status, pull, push, settingsGet, settingsPut, schedulerReload };
