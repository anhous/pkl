'use strict';
const { buildSyncMessage, ENTITIES } = require('./sync.validators');

function assertEntity(entity) {
  if (!ENTITIES.includes(entity)) {
    const e = new Error(`Entity harus salah satu: ${ENTITIES.join(', ')}`);
    e.status = 400;
    throw e;
  }
}

// Stub Tahap 2: hanya catat log, belum mutasi master.
// Fase 5: isi pull EMIS/DAPODIK + upsert per entity + cron scheduler.
async function runManualSync(prisma, { entity, sourceApp, endpoint, payload }) {
  assertEntity(entity);
  const count = Array.isArray(payload) ? payload.length : 0;
  const log = await prisma.syncLog.create({
    data: {
      sourceApp: sourceApp || 'MANUAL',
      endpoint: endpoint || `/sync/${entity}/run`,
      status: 'BERJALAN',
      message: `Mulai sync ${entity}`,
      recordCount: 0,
    },
  });
  try {
    const message = buildSyncMessage(entity, count, sourceApp || 'MANUAL');
    const done = await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'SUKSES', message, recordCount: count },
    });
    return done;
  } catch (e) {
    await prisma.syncLog.update({
      where: { id: log.id },
      data: { status: 'GAGAL', message: e.message },
    });
    throw e;
  }
}

async function listLogs(prisma, { skip, take, order, sourceApp, status }) {
  const where = {};
  if (sourceApp) where.sourceApp = sourceApp;
  if (status) where.status = status;
  const [total, data] = await Promise.all([
    prisma.syncLog.count({ where }),
    prisma.syncLog.findMany({ where, skip, take, orderBy: { id: order } }),
  ]);
  return { total, data };
}

module.exports = { runManualSync, listLogs, assertEntity };
