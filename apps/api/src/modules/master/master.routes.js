'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { zodMiddleware } = require('../auth/auth.validators');
const v = require('./master.validators');
const c = require('./master.controller');

const READ = ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'];
const WRITE = ['SUPERADMIN', 'ADMIN_SEKOLAH'];

function masterRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);

  const bind = (base, validators, handlers) => {
    r.get(`/${base}`, auth, requireRole(...READ), handlers.list);
    r.get(`/${base}/:id`, auth, requireRole(...READ), handlers.detail);
    r.post(`/${base}`, auth, requireRole(...WRITE), zodMiddleware(validators.create), handlers.create);
    r.patch(`/${base}/:id`, auth, requireRole(...WRITE), zodMiddleware(validators.update), handlers.update);
    r.delete(`/${base}/:id`, auth, requireRole(...WRITE), handlers.remove);
  };

  bind('jurusan', { create: v.jurusanCreate, update: v.jurusanUpdate }, {
    list: c.listJurusan, detail: c.detailJurusan, create: c.createJurusan, update: c.updateJurusan, remove: c.removeJurusan,
  });
  bind('siswa', { create: v.siswaCreate, update: v.siswaUpdate }, {
    list: c.listSiswa, detail: c.detailSiswa, create: c.createSiswa, update: c.updateSiswa, remove: c.removeSiswa,
  });
  bind('guru', { create: v.guruCreate, update: v.guruUpdate }, {
    list: c.listGuru, detail: c.detailGuru, create: c.createGuru, update: c.updateGuru, remove: c.removeGuru,
  });
  bind('dudi', { create: v.dudiCreate, update: v.dudiUpdate }, {
    list: c.listDudi, detail: c.detailDudi, create: c.createDudi, update: c.updateDudi, remove: c.removeDudi,
  });
  bind('instruktur', { create: v.instrukturCreate, update: v.instrukturUpdate }, {
    list: c.listInstruktur, detail: c.detailInstruktur, create: c.createInstruktur, update: c.updateInstruktur, remove: c.removeInstruktur,
  });

  return r;
}

module.exports = { masterRoutes };
