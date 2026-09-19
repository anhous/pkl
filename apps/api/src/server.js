'use strict';
const env = require('./config/env');
const { createApp } = require('./app');

const app = createApp();

// Scheduler SDMS: hanya bila SDMS_SYNC_ENABLED=true DAN instance ini pemilik jadwal.
// Dalam mode cluster PM2, NODE_APP_INSTANCE=0 adalah pemilik; instance lain skip
// agar pull/push tidak jalan ganda.
const isSchedulerOwner = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
try {
  const { prisma } = require('./config/db');
  const { SdmsClient } = require('./modules/sync/sdms.client');
  const { startScheduler } = require('./modules/sync/sync.scheduler');
  startScheduler({
    prisma,
    makeClient: () => new SdmsClient({ baseUrl: env.sdmsBaseUrl, username: env.sdmsUsername, password: env.sdmsPassword, apiKey: env.sdmsApiKey }),
    env: { ...env, sdmsSyncEnabled: env.sdmsSyncEnabled && isSchedulerOwner },
  });
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[pkl-api] scheduler nonaktif:', e.message);
}

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[pkl-api] listening on :${env.port} (${env.nodeEnv})`);
});
