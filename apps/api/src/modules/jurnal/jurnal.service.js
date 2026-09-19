'use strict';

// Pure helpers — unit-test tanpa DB.
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function assertJamRange(jamMulai, jamSelesai) {
  if (!jamMulai || !jamSelesai) return;
  if (toMinutes(jamMulai) >= toMinutes(jamSelesai)) {
    const e = new Error('jamMulai harus sebelum jamSelesai');
    e.status = 400;
    throw e;
  }
}

// Siswa hanya boleh edit saat MENUNGGU/REVISI (terkunci jika DIPERIKSA/DISETUJUI).
function canSiswaEdit(status) {
  return status === 'MENUNGGU' || status === 'REVISI';
}

function assertNilai(n) {
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    const e = new Error('nilaiGuru harus 1-100');
    e.status = 400;
    throw e;
  }
}

async function ensurePenempatanAccess(prisma, user, penempatanId) {
  const p = await prisma.penempatanPkl.findUnique({ where: { id: penempatanId } });
  if (!p) { const e = new Error('Penempatan tidak ditemukan'); e.status = 404; throw e; }
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN_SEKOLAH') return p;
  if (user.role === 'SISWA') {
    const s = await prisma.masterSiswa.findFirst({ where: { userId: user.id } });
    if (!s || p.siswaId !== s.id) { const e = new Error('Forbidden: bukan penempatan Anda'); e.status = 403; throw e; }
    return p;
  }
  if (user.role === 'GURU') {
    const g = await prisma.masterGuru.findFirst({ where: { userId: user.id } });
    if (g && p.guruId !== g.id) { const e = new Error('Forbidden: bukan siswa bimbingan Anda'); e.status = 403; throw e; }
    return p;
  }
  const e = new Error('Forbidden');
  e.status = 403;
  throw e;
}

async function scopeJurnalWhere(prisma, user, query = {}) {
  const where = {};
  if (query.penempatanId) where.penempatanId = query.penempatanId;
  if (query.status) where.statusVerifikasi = query.status;
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
    if (query.penempatanId) {
      if (!ids.includes(query.penempatanId)) { const e = new Error('Forbidden'); e.status = 403; throw e; }
      return where;
    }
    return { ...where, penempatanId: { in: ids.length ? ids : [-1] } };
  }
  if (user.role === 'GURU') {
    const g = await prisma.masterGuru.findFirst({ where: { userId: user.id } });
    if (!g) return where; // kompat seed awal: lihat semua
    const placements = await prisma.penempatanPkl.findMany({ where: { guruId: g.id }, select: { id: true } });
    const ids = placements.map((x) => x.id);
    if (query.penempatanId) {
      if (!ids.includes(query.penempatanId)) { const e = new Error('Forbidden: bukan bimbingan Anda'); e.status = 403; throw e; }
      return where;
    }
    return { ...where, penempatanId: { in: ids.length ? ids : [-1] } };
  }
  return where;
}

module.exports = { toMinutes, assertJamRange, canSiswaEdit, assertNilai, ensurePenempatanAccess, scopeJurnalWhere };
