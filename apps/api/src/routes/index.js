'use strict';
const { Router } = require('express');
const { authRoutes } = require('../modules/auth/auth.routes');
const { masterRoutes } = require('../modules/master/master.routes');
const { webhookRoutes } = require('../modules/sync/sync.webhook.routes');
const { penempatanRoutes } = require('../modules/penempatan/penempatan.routes');
const { syncRoutes } = require('../modules/sync/sync.routes');
const { jurnalRoutes } = require('../modules/jurnal/jurnal.routes');
const { presensiRoutes } = require('../modules/presensi/presensi.routes');
const { analitikRoutes } = require('../modules/analitik/analitik.routes');

function buildRoutes(prisma) {
  const r = Router();
  r.get('/health', (_req, res) => res.json({ ok: true, service: 'pkl-api', time: new Date().toISOString() }));
  r.use('/auth', authRoutes(prisma));
  r.use('/webhooks/sdms', webhookRoutes(prisma));
  r.use('/master', masterRoutes(prisma));
  r.use('/penempatan', penempatanRoutes(prisma));
  r.use('/jurnal', jurnalRoutes(prisma));
  r.use('/presensi', presensiRoutes(prisma));
  r.use('/analitik', analitikRoutes(prisma));
  r.use('/sync', syncRoutes(prisma));
  return r;
}

module.exports = { buildRoutes };
