'use strict';

// Pure helpers — diunit-test tanpa DB.
function assertDateRange(tanggalMulai, tanggalSelesai) {
  const a = new Date(tanggalMulai);
  const b = new Date(tanggalSelesai);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    const e = new Error('Tanggal tidak valid');
    e.status = 400;
    throw e;
  }
  if (a > b) {
    const e = new Error('tanggalMulai tidak boleh setelah tanggalSelesai');
    e.status = 400;
    throw e;
  }
}

// kuota<=0 = tanpa batas. True jika masih ada slot.
function hasQuotaSlot(activeCount, kuota) {
  if (!kuota || kuota <= 0) return true;
  return activeCount < kuota;
}

async function resolveScopeWhere(prisma, user) {
  if (user.role === 'SISWA') {
    const s = await prisma.masterSiswa.findFirst({ where: { userId: user.id } });
    if (!s) return { siswaId: -1 }; // belum tertaut → kosong
    return { siswaId: s.id };
  }
  if (user.role === 'GURU') {
    const g = await prisma.masterGuru.findFirst({ where: { userId: user.id } });
    if (!g) return {}; // guru tanpa tautan: lihat semua bimbingan (kompat seed awal)
    return { guruId: g.id };
  }
  return {};
}

async function ensureRefs(prisma, { siswaId, dudiId, guruId, instrukturId }) {
  const [siswa, dudi] = await Promise.all([
    siswaId ? prisma.masterSiswa.findUnique({ where: { id: siswaId } }) : null,
    dudiId ? prisma.masterDudi.findUnique({ where: { id: dudiId } }) : null,
  ]);
  if (siswaId && !siswa) { const e = new Error('Siswa tidak ditemukan'); e.status = 404; throw e; }
  if (dudiId && !dudi) { const e = new Error('DUDI tidak ditemukan'); e.status = 404; throw e; }
  if (guruId) {
    const g = await prisma.masterGuru.findUnique({ where: { id: guruId } });
    if (!g) { const e = new Error('Guru tidak ditemukan'); e.status = 404; throw e; }
  }
  if (instrukturId) {
    const ins = await prisma.masterInstruktur.findUnique({ where: { id: instrukturId } });
    if (!ins) { const e = new Error('Instruktur tidak ditemukan'); e.status = 404; throw e; }
  }
  return { siswa, dudi };
}

async function ensureSingleActive(prisma, siswaId, excludeId) {
  const existing = await prisma.penempatanPkl.findFirst({
    where: { siswaId, status: 'AKTIF', ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (existing) {
    const e = new Error('Siswa sudah memiliki penempatan AKTIF');
    e.status = 409;
    throw e;
  }
}

async function ensureQuota(prisma, dudiId, excludeId) {
  const dudi = await prisma.masterDudi.findUnique({ where: { id: dudiId } });
  if (!dudi) return;
  if (!dudi.kuota || dudi.kuota <= 0) return;
  const activeCount = await prisma.penempatanPkl.count({
    where: { dudiId, status: 'AKTIF', ...(excludeId ? { NOT: { id: excludeId } } : {}) },
  });
  if (!hasQuotaSlot(activeCount, dudi.kuota)) {
    const e = new Error(`Kuota DUDI penuh (${activeCount}/${dudi.kuota})`);
    e.status = 409;
    throw e;
  }
}

const INCLUDE = {
  siswa: { include: { jurusan: true } },
  dudi: true,
  guru: true,
  instruktur: true,
  _count: { select: { jurnal: true, presensi: true } },
};

async function listPenempatan(prisma, user, { skip, take, search, order, status, dudiId, guruId, siswaId }) {
  const scope = await resolveScopeWhere(prisma, user);
  const where = { ...scope };
  if (status) where.status = status;
  if (dudiId) where.dudiId = dudiId;
  if (guruId) where.guruId = guruId;
  if (siswaId) {
    // GURU/SISWA tidak boleh intip siswa lain di luar scope-nya
    if (scope.siswaId && scope.siswaId !== siswaId) { const e = new Error('Forbidden'); e.status = 403; throw e; }
    if (scope.guruId) {
      const own = await prisma.penempatanPkl.findFirst({ where: { id: undefined, siswaId, guruId: scope.guruId } }).catch(() => null);
      void own;
    }
    where.siswaId = siswaId;
  }
  if (search) {
    where.OR = [
      { siswa: { nama: { contains: search } } },
      { siswa: { nisn: { contains: search } } },
      { dudi: { nama: { contains: search } } },
    ];
  }
  const [total, data] = await Promise.all([
    prisma.penempatanPkl.count({ where }),
    prisma.penempatanPkl.findMany({ where, skip, take, orderBy: { id: order }, include: INCLUDE }),
  ]);
  return { total, data };
}

async function createPenempatan(prisma, input) {
  assertDateRange(input.tanggalMulai, input.tanggalSelesai);
  await ensureRefs(prisma, input);
  const status = input.status || 'AKTIF';
  if (status === 'AKTIF') {
    await ensureSingleActive(prisma, input.siswaId);
    await ensureQuota(prisma, input.dudiId);
  }
  return prisma.penempatanPkl.create({ data: { ...input, status }, include: INCLUDE });
}

async function updatePenempatan(prisma, id, input) {
  const cur = await prisma.penempatanPkl.findUnique({ where: { id } });
  if (!cur) { const e = new Error('Penempatan tidak ditemukan'); e.status = 404; throw e; }
  const next = { ...cur, ...input };
  if (input.tanggalMulai || input.tanggalSelesai) assertDateRange(next.tanggalMulai, next.tanggalSelesai);
  await ensureRefs(prisma, { siswaId: next.siswaId, dudiId: next.dudiId, guruId: next.guruId ?? null, instrukturId: next.instrukturId ?? null });
  if ((input.status || cur.status) === 'AKTIF') {
    await ensureSingleActive(prisma, next.siswaId, id);
    await ensureQuota(prisma, next.dudiId, id);
  }
  return prisma.penempatanPkl.update({ where: { id }, data: input, include: INCLUDE });
}

module.exports = {
  assertDateRange, hasQuotaSlot, resolveScopeWhere,
  listPenempatan, createPenempatan, updatePenempatan,
};
