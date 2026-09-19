'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { zodMiddleware } = require('../auth/auth.validators');
const v = require('./penempatan.validators');
const c = require('./penempatan.controller');

function penempatanRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);

  r.get('/', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'), c.list);
  r.get('/:id', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'), c.detail);
  r.post('/', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH'), zodMiddleware(v.penempatanCreate), c.create);
  r.patch('/:id', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH'), zodMiddleware(v.penempatanUpdate), c.update);
  r.delete('/:id', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH'), c.remove);
  return r;
}

module.exports = { penempatanRoutes };
