'use strict';
const { parsePagination, buildMeta, parseId } = require('../../utils/pagination');
const svc = require('./master.service');

function listHandler(listFn, { allowSort = ['id'], filters = () => ({}) } = {}) {
  return async (req, res, next) => {
    try {
      const { page, limit, search, order, skip } = parsePagination(req.query);
      const sortBy = allowSort.includes(req.query.sortBy) ? req.query.sortBy : undefined;
      void sortBy;
      const extra = filters(req.query);
      const { total, data } = await listFn(req.prisma, { skip, take: limit, search, order, ...extra });
      res.json({ data, meta: buildMeta({ page, limit, total }) });
    } catch (e) { next(e); }
  };
}

function detailHandler(model) {
  return async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const row = await req.prisma[model].findUnique({ where: { id } });
      if (!row) return res.status(404).json({ message: 'Tidak ditemukan' });
      res.json(row);
    } catch (e) { next(e); }
  };
}

function createHandler(createFn) {
  return async (req, res, next) => {
    try {
      const row = await createFn(req.prisma, req.validated);
      res.status(201).json(row);
    } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
  };
}

function updateHandler(updateFn) {
  return async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const row = await updateFn(req.prisma, id, req.validated);
      res.json(row);
    } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
  };
}

function removeHandler(removeFn) {
  return async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      await removeFn(req.prisma, id);
      res.json({ message: 'Dihapus' });
    } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
  };
}

module.exports = {
  listJurusan: listHandler(svc.listJurusan),
  detailJurusan: detailHandler('masterJurusan'),
  createJurusan: createHandler(svc.createJurusan),
  updateJurusan: updateHandler(svc.updateJurusan),
  removeJurusan: removeHandler(svc.removeJurusan),

  listSiswa: listHandler(svc.listSiswa, {
    filters: (q) => ({
      status: ['AKTIF', 'SELESAI', 'KELUAR'].includes(q.status) ? q.status : undefined,
      jurusanId: q.jurusanId ? parseInt(q.jurusanId, 10) || undefined : undefined,
    }),
  }),
  detailSiswa: detailHandler('masterSiswa'),
  createSiswa: createHandler(svc.createSiswa),
  updateSiswa: updateHandler(svc.updateSiswa),
  removeSiswa: removeHandler(svc.removeSiswa),

  listGuru: listHandler(svc.listGuru),
  detailGuru: detailHandler('masterGuru'),
  createGuru: createHandler(svc.createGuru),
  updateGuru: updateHandler(svc.updateGuru),
  removeGuru: removeHandler(svc.removeGuru),

  listDudi: listHandler(svc.listDudi),
  detailDudi: async (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const row = await req.prisma.masterDudi.findUnique({
        where: { id },
        include: { _count: { select: { penempatan: true } }, instruktur: true },
      });
      if (!row) return res.status(404).json({ message: 'Tidak ditemukan' });
      res.json(row);
    } catch (e) { next(e); }
  },
  createDudi: createHandler(svc.createDudi),
  updateDudi: updateHandler(svc.updateDudi),
  removeDudi: removeHandler(svc.removeDudi),

  listInstruktur: listHandler(svc.listInstruktur, {
    filters: (q) => ({ dudiId: q.dudiId ? parseInt(q.dudiId, 10) || undefined : undefined }),
  }),
  detailInstruktur: detailHandler('masterInstruktur'),
  createInstruktur: createHandler(svc.createInstruktur),
  updateInstruktur: updateHandler(svc.updateInstruktur),
  removeInstruktur: removeHandler(svc.removeInstruktur),
};
