'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const c = require('./analitik.controller');

const READ = ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'];

function analitikRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);

  r.get('/overview', auth, requireRole(...READ), c.overview);
  r.get('/dudi-map', auth, requireRole(...READ), c.dudiMap);
  r.get('/kehadiran', auth, requireRole(...READ), c.kehadiran);
  r.get('/dudi-terbaik', auth, requireRole(...READ), c.dudiTerbaik);
  r.get('/siswa-nilai-tertinggi', auth, requireRole(...READ), c.nilaiTertinggi);
  r.get('/siswa-terajin', auth, requireRole(...READ), c.terajin);
  r.get('/siswa-bermasalah', auth, requireRole(...READ), c.bermasalah);
  r.get('/jurnal-teraktif', auth, requireRole(...READ), c.teraktif);
  r.get('/export', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH'), c.exportData);
  return r;
}

module.exports = { analitikRoutes };
