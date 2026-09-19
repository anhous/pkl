'use strict';
const { parsePagination, buildMeta, parseId, prismaKnownError } = require('../../utils/pagination');
const { getStorage } = require('../../config/storage');
const { assertJamRange, canSiswaEdit, assertNilai, ensurePenempatanAccess, scopeJurnalWhere } = require('./jurnal.service');
const { fotoExt } = require('./jurnal.validators');

const INCLUDE = { penempatan: { include: { siswa: true, dudi: true, guru: true } } };

async function list(req, res, next) {
  try {
    const { page, limit, search, order, skip } = parsePagination(req.query);
    const where = await scopeJurnalWhere(req.prisma, req.user, {
      penempatanId: req.query.penempatanId ? parseInt(req.query.penempatanId, 10) || undefined : undefined,
      status: ['MENUNGGU', 'DIPERIKSA', 'DISETUJUI', 'REVISI'].includes(req.query.status) ? req.query.status : undefined,
      from: req.query.from, to: req.query.to,
    });
    if (search) where.deskripsi = { contains: search };
    const [total, data] = await Promise.all([
      req.prisma.jurnalHarian.count({ where }),
      req.prisma.jurnalHarian.findMany({ where, skip, take: limit, orderBy: [{ tanggal: order }, { id: order }], include: INCLUDE }),
    ]);
    res.json({ data, meta: buildMeta({ page, limit, total }) });
  } catch (e) { next(e); }
}

async function detail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const row = await req.prisma.jurnalHarian.findUnique({ where: { id }, include: INCLUDE });
    if (!row) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, row.penempatanId);
    res.json(row);
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    const v = req.validated;
    assertJamRange(v.jamMulai, v.jamSelesai);
    await ensurePenempatanAccess(req.prisma, req.user, v.penempatanId);

    let fotoUrl = null;
    if (req.file) {
      const storage = getStorage();
      const saved = await storage.save(req.file.buffer, { folder: 'jurnal', ext: fotoExt(req.file.mimetype) });
      fotoUrl = saved.url;
    }
    const row = await req.prisma.jurnalHarian.create({
      data: { ...v, fotoUrl },
      include: INCLUDE,
    });
    res.status(201).json(row);
  } catch (e) {
    throwKnown(e, next, 'Jurnal');
  }
}

async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const cur = await req.prisma.jurnalHarian.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, cur.penempatanId);

    if (req.user.role === 'SISWA' && !canSiswaEdit(cur.statusVerifikasi)) {
      return res.status(403).json({ message: 'Jurnal terkunci (sudah DIPERIKSA/DISETUJUI)' });
    }
    const v = req.validated;
    if (v.jamMulai || v.jamSelesai) assertJamRange(v.jamMulai || cur.jamMulai, v.jamSelesai || cur.jamSelesai);
    if (v.penempatanId && v.penempatanId !== cur.penempatanId) {
      return res.status(400).json({ message: 'penempatanId tidak dapat diubah' });
    }
    delete v.penempatanId;

    let fotoUrl;
    if (req.file) {
      const storage = getStorage();
      const saved = await storage.save(req.file.buffer, { folder: 'jurnal', ext: fotoExt(req.file.mimetype) });
      fotoUrl = saved.url;
      if (cur.fotoUrl) await storage.removeByUrl(cur.fotoUrl);
    }
    const row = await req.prisma.jurnalHarian.update({
      where: { id },
      data: { ...v, ...(fotoUrl ? { fotoUrl } : {}) },
      include: INCLUDE,
    });
    res.json(row);
  } catch (e) {
    throwKnown(e, next, 'Jurnal');
  }
}

async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const cur = await req.prisma.jurnalHarian.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, cur.penempatanId);
    if (req.user.role === 'SISWA' && !canSiswaEdit(cur.statusVerifikasi)) {
      return res.status(403).json({ message: 'Jurnal terkunci, tidak dapat dihapus' });
    }
    await req.prisma.jurnalHarian.delete({ where: { id } });
    if (cur.fotoUrl) await getStorage().removeByUrl(cur.fotoUrl);
    res.json({ message: 'Dihapus' });
  } catch (e) { next(e); }
}

// Guru/Admin: nilai 1-100 + catatan + status verifikasi. Scope bimbingan dicek.
async function nilai(req, res, next) {
  try {
    const id = parseId(req.params.id);
    const cur = await req.prisma.jurnalHarian.findUnique({ where: { id } });
    if (!cur) return res.status(404).json({ message: 'Tidak ditemukan' });
    await ensurePenempatanAccess(req.prisma, req.user, cur.penempatanId);
    assertNilai(req.validated.nilaiGuru);
    const row = await req.prisma.jurnalHarian.update({
      where: { id },
      data: {
        nilaiGuru: req.validated.nilaiGuru,
        catatanGuru: req.validated.catatanGuru ?? undefined,
        statusVerifikasi: req.validated.statusVerifikasi || 'DIPERIKSA',
      },
      include: INCLUDE,
    });
    res.json(row);
  } catch (e) { next(Object.assign(e, { status: e.status || 500 })); }
}

function throwKnown(e, next, resource) {
  if (e && e.code === 'P2002') return next(Object.assign(new Error('Jurnal tanggal tersebut sudah ada untuk penempatan ini'), { status: 409 }));
  if (e && e.code === 'P2025') return next(Object.assign(new Error('Tidak ditemukan'), { status: 404 }));
  if (e && e.status) return next(e);
  const { prismaKnownError: map } = require('../../utils/pagination');
  return next(map(e, { resource }));
}

module.exports = { list, detail, create, update, remove, nilai };
