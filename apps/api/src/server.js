'use strict';
const env = require('./config/env');
const { createApp } = require('./app');

const app = createApp();

// Scheduler SDMS: hanya bila SDMS_SYNC_ENABLED=true DAN instance ini pemilik jadwal.
// Dalam mode cluster PM2, NODE_APP_INSTANCE=0 adalah pemilik; instance lain skip
// agar pull/push tidak jalan ganda. Pengaturan dibaca dari DB (diubah via halaman
// Sync) dengan .env sebagai bawaan.
const isSchedulerOwner = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
try {
  const { prisma } = require('./config/db');
  const { effectiveSyncEnv, makeClientFromDb } = require('./modules/sync/settings');
  const { startScheduler } = require('./modules/sync/sync.scheduler');
  effectiveSyncEnv(prisma)
    .then((eff) => startScheduler({
      prisma,
      makeClient: () => makeClientFromDb(prisma),
      env: { ...eff, sdmsSyncEnabled: eff.sdmsSyncEnabled && isSchedulerOwner },
    }))
    .catch((e) => console.warn('[pkl-api] scheduler nonaktif:', e.message));
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[pkl-api] scheduler nonaktif:', e.message);
}

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[pkl-api] listening on :${env.port} (${env.nodeEnv})`);
});
