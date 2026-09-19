'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { zodMiddleware } = require('../auth/auth.validators');
const { syncRunSchema } = require('./sync.validators');
const c = require('./sync.controller');

function syncRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);
  const admin = requireRole('SUPERADMIN', 'ADMIN_SEKOLAH');

  r.get('/status', auth, admin, c.status);
  r.get('/logs', auth, admin, c.list);
  r.get('/logs/:id', auth, admin, c.detail);
  r.post('/jurnal/push', auth, admin, c.push);
  r.post('/:entity/pull', auth, admin, c.pull);
  r.post('/:entity/run', auth, admin, zodMiddleware(syncRunSchema), c.run);
  return r;
}

module.exports = { syncRoutes };
