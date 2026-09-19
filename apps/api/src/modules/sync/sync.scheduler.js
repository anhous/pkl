'use strict';

// Scheduler sync SDMS (node-cron). Aktif hanya bila SDMS_SYNC_ENABLED=true.
// - pullCron: tarik master (jurusan/siswa/guru) — default tiap jam 02:00
// - pushCron: dorong jurnal ke gateway SDMS — default tiap jam :05
// Status diekspos via GET /api/sync/status agar admin bisa memantau tanpa SSH.

let cron = null;
try {
  cron = require('node-cron');
} catch {
  cron = null;
}

const state = {
  enabled: false,
  pullCron: null,
  pushCron: null,
  jobs: [],
  lastPull: null,
  lastPush: null,
  lastError: null,
};

function validCron(expr) {
  return Boolean(cron && typeof expr === 'string' && cron.validate(expr));
}

function startScheduler({ prisma, makeClient, env }) {
  stopScheduler();
  state.enabled = env.sdmsSyncEnabled && Boolean(cron);
  state.pullCron = env.sdmsPullCron;
  state.pushCron = env.sdmsPushCron;
  if (!state.enabled) return state;
  const { pullAll, pushJurnal } = require('./sync.engine');

  if (validCron(state.pullCron)) {
    const job = cron.schedule(state.pullCron, async () => {
      try {
        await pullAll(prisma, makeClient());
        state.lastPull = new Date().toISOString();
      } catch (e) {
        state.lastError = `pull: ${e.message}`;
      }
    });
    state.jobs.push(job);
  }
  if (validCron(state.pushCron)) {
    const job = cron.schedule(state.pushCron, async () => {
      try {
        await pushJurnal(prisma, makeClient(), { limit: 200 });
        state.lastPush = new Date().toISOString();
      } catch (e) {
        state.lastError = `push: ${e.message}`;
      }
    });
    state.jobs.push(job);
  }
  return state;
}

function stopScheduler() {
  for (const j of state.jobs) {
    try { j.stop(); } catch { /* abaikan */ }
  }
  state.jobs = [];
  return state;
}

function schedulerStatus() {
  return {
    enabled: state.enabled,
    cronAvailable: Boolean(cron),
    pullCron: state.pullCron,
    pushCron: state.pushCron,
    jobs: state.jobs.length,
    lastPull: state.lastPull,
    lastPush: state.lastPush,
    lastError: state.lastError,
  };
}

module.exports = { startScheduler, stopScheduler, schedulerStatus };
