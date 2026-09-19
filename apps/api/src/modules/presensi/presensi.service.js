'use strict';
const { ensurePenempatanAccess } = require('../jurnal/jurnal.service');

// Konsistensi: SAKIT → kondisi tidak boleh SEHAT; HADIR → idealnya SEHAT.
function assertKonsistensi(statusKehadiran, kondisiKesehatan) {
  if (statusKehadiran === 'SAKIT' && kondisiKesehatan === 'SEHAT') {
    const e = new Error('Konsistensi: SAKIT harus disertai SAKIT_RINGAN/BUTUH_PENANGANAN');
    e.status = 400;
    throw e;
  }
}

async function scopePresensiWhere(prisma, user, query = {}) {
  const where = {};
  if (query.penempatanId) where.penempatanId = query.penempatanId;
  if (query.status) where.statusKehadiran = query.status;
  if (query.from || query.to) {
    where.tanggal = {};
    if (query.from) where.tanggal.gte = new Date(query.from);
    if (query.to) where.tanggal.lte = new Date(query.to);
  }
  if (user.role === 'SISWA') {
    const s = await prisma.masterSiswa.findFirst({ where: { userId: user.id } });
    if (!s) return { penempatanId: -1 };
    const placements = await prisma.penempatanPkl.findMany({ where: { siswaId: s.id }, select: { id: true } });
    const ids = placements.map((x) => x.id);
    if (query.penempatanId && !ids.includes(query.penempatanId)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    return { ...where, penempatanId: query.penempatanId ?? { in: ids.length ? ids : [-1] } };
  }
  if (user.role === 'GURU') {
    const g = await prisma.masterGuru.findFirst({ where: { userId: user.id } });
    if (!g) return where;
    const placements = await prisma.penempatanPkl.findMany({ where: { guruId: g.id }, select: { id: true } });
    const ids = placements.map((x) => x.id);
    if (query.penempatanId && !ids.includes(query.penempatanId)) { const e = new Error('Forbidden: bukan bimbingan Anda'); e.status = 403; throw e; }
    return { ...where, penempatanId: query.penempatanId ?? { in: ids.length ? ids : [-1] } };
  }
  return where;
}

module.exports = { assertKonsistensi, scopePresensiWhere, ensurePenempatanAccess };
