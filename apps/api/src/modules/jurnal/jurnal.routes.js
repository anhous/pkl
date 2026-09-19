'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { upload } = require('../../middlewares/upload');
const { zodMiddleware } = require('../auth/auth.validators');
const v = require('./jurnal.validators');
const c = require('./jurnal.controller');

function jurnalRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);

  r.get('/', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'), c.list);
  r.get('/:id', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU', 'SISWA'), c.detail);
  // Siswa ( + admin bantuan input ) — multipart foto opsional
  r.post('/', auth, requireRole('SISWA', 'SUPERADMIN', 'ADMIN_SEKOLAH'), upload.single('foto'), zodMiddleware(v.jurnalCreate), c.create);
  r.patch('/:id', auth, requireRole('SISWA', 'SUPERADMIN', 'ADMIN_SEKOLAH'), upload.single('foto'), zodMiddleware(v.jurnalUpdate), c.update);
  r.delete('/:id', auth, requireRole('SISWA', 'SUPERADMIN', 'ADMIN_SEKOLAH'), c.remove);
  // Penilaian guru
  r.patch('/:id/nilai', auth, requireRole('GURU', 'SUPERADMIN', 'ADMIN_SEKOLAH'), zodMiddleware(v.nilaiSchema), c.nilai);
  return r;
}

module.exports = { jurnalRoutes };
