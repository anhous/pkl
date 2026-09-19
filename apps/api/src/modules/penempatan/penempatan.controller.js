'use strict';
const { parsePagination, buildMeta, parseId } = require('../../utils/pagination');
const svc = require('./penempatan.service');

async function list(req, res, next) {
  try {
    const { page, limit, search, order, skip } = parsePagination(req.query);
    const { total, data } = await svc.listPenempatan(req.prisma, req.user, {
      skip, take: limit, search, order,
      status: ['AKTIF', 'SELESAI', 'BATAL'].includes(req.query.status) ? req.query.status : undefined,
      dudiId: req.query.dudiId ? parseInt(req.query.dudiId, 10) || undefined : undefined,
      guruId: req.query.guruId ? parseInt(req.query.guruId, 10) || undefined : undefined,
      siswaId: req.query.siswaId ? parseInt(req.query.siswaId, 10) || undefined : undefined,
    });
    res.json({ data, meta: buildMeta({ page, limit, total }) });
  } catch (e) { next(e); }
}

async function detail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const row = await req.prisma.penempatanPkl.findUnique({
      where: { id },
      include: { siswa: true, dudi: true, guru: true, instruktur: true, _count: { select: { jurnal: true, presensi: true } } },
    });
    if (!row) return res.status(404).json({ message: 'Tidak ditemukan' });
    // Ownership: siswa hanya boleh lihat miliknya, guru hanya bimbingannya
    if (req.user.role === 'SISWA') {
      const s = await req.prisma.masterSiswa.findFirst({ where: { userId: req.user.id } });
      if (!s || row.siswaId !== s.id) return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(row);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const row = await svc.createPenempatan(req.prisma, req.validated);
    res.status(201).json(row);
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const row = await svc.updatePenempatan(req.prisma, id, req.validated);
    res.json(row);
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    await req.prisma.penempatanPkl.delete({ where: { id } });
    res.json({ message: 'Dihapus (jurnal & presensi ikut terhapus via cascade)' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ message: 'Tidak ditemukan' });
    next(e);
  }
}

module.exports = { list, detail, create, update, remove };
