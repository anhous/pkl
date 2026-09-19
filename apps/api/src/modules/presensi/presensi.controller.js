'use strict';
const { parsePagination, buildMeta, parseId } = require('../../utils/pagination');
const { assertKonsistensi, scopePresensiWhere, ensurePenempatanAccess } = require('./presensi.service');

const INCLUDE = { penempatan: { include: { siswa: true, dudi: true } } };

async function list(req, res, next) {
  try {
    const { page, limit, order, skip } = parsePagination(req.query);
    const where = await scopePresensiWhere(req.prisma, req.user, {
      penempatanId: req.query.penempatanId ? parseInt(req.query.penempatanId, 10) || undefined : undefined,
      status: ['HADIR', 'IZIN', 'SAKIT', 'ALPHA'].includes(req.query.status) ? req.query.status : undefined,
      from: req.query.from, to: req.query.to,
    });
    const [total, data] = await Promise.all([
      req.prisma.presensiKesehatan.count({ where }),
      req.prisma.presensiKesehatan.findMany({ where, skip, take: limit, orderBy: [{ tanggal: order }, { id: order }], include: INCLUDE }),
    ]);
    res.json({ data, meta: buildMeta({ page, limit, total }) });
  } catch (e) { next(e); }
}

async function detail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const row = await req.prisma.presensiKesehatan.findUnique({ where: { id }, include: INCLUDE });
    if (!row) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, row.penempatanId);
    res.json(row);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const v = req.validated;
    assertKonsistensi(v.statusKehadiran, v.kondisiKesehatan);
    await ensurePenempatanAccess(req.prisma, req.user, v.penempatanId);
    const row = await req.prisma.presensiKesehatan.create({ data: v, include: INCLUDE });
    res.status(201).json(row);
  } catch (e) {
    if (e && e.code === 'P2002') return next(Object.assign(new Error('Presensi tanggal tersebut sudah ada'), { status: 409 }));
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const cur = await req.prisma.presensiKesehatan.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, cur.penempatanId);
    const v = req.validated;
    if (v.penempatanId && v.penempatanId !== cur.penempatanId) return res.status(400).json({ message: 'penempatanId tidak dapat diubah' });
    assertKonsistensi(v.statusKehadiran || cur.statusKehadiran, v.kondisiKesehatan || cur.kondisiKesehatan);
    const row = await req.prisma.presensiKesehatan.update({ where: { id }, data: v, include: INCLUDE });
    res.json(row);
  } catch (e) {
    if (e && e.code === 'P2002') return next(Object.assign(new Error('Presensi tanggal tersebut sudah ada'), { status: 409 }));
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const cur = await req.prisma.presensiKesehatan.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, cur.penempatanId);
    await req.prisma.presensiKesehatan.delete({ where: { id } });
    res.json({ message: 'Dihapus' });
  } catch (e) { next(e); }
}

module.exports = { list, detail, create, update, remove };
