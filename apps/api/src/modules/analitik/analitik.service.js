'use strict';

// ---------- Pure helpers (unit-test tanpa DB) ----------
function toPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10; // 1 desimal
}

function dayDiff(a, b) {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

// Skor DUDI 0-100: 70% rata nilai + 30% keaktifan (avg jurnal/siswa, cap 5 jurnal = 100).
function calcDudiScore(avgNilai, avgJurnalPerSiswa) {
  const n = Math.min(100, Math.max(0, avgNilai || 0));
  const k = Math.min(100, Math.max(0, (avgJurnalPerSiswa || 0) * 20));
  return Math.round((0.7 * n + 0.3 * k) * 10) / 10;
}

// Skor kerajinan 0-100: 50% hadir + 50% tepat waktu.
function calcRajinScore(hadirPct, onTimePct) {
  return Math.round(((hadirPct || 0) * 0.5 + (onTimePct || 0) * 0.5) * 10) / 10;
}

// Aturan early warning. Return array alasan (kosong = aman).
function flagBermasalah({ daysSinceLastJurnal, hadirRate, presensiTotal, alphaCount, sakitBerat7d }) {
  const reasons = [];
  if (daysSinceLastJurnal != null && daysSinceLastJurnal > 2) reasons.push(`JURNAL_MACET:${daysSinceLastJurnal}hari`);
  if (presensiTotal >= 3 && hadirRate < 75) reasons.push(`ABSEN_TINGGI:${hadirRate}%`);
  if ((alphaCount || 0) >= 2) reasons.push(`ALPHA:${alphaCount}x`);
  if (sakitBerat7d) reasons.push('SAKIT_BERAT_7D');
  return reasons;
}

function escapeCsv(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(columns, rows) {
  const head = columns.map(escapeCsv).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(r[c])).join(',')).join('\n');
  return `${head}\n${body}`;
}

function sameDayOrNext(tanggal, createdAt) {
  const t = new Date(tanggal).setHours(0, 0, 0, 0);
  const c = new Date(createdAt).setHours(0, 0, 0, 0);
  return c <= t + 86400000; // toleransi H+1 (input malam hari)
}

// ---------- Scope ----------
async function guidedWhere(prisma, user) {
  if (user.role === 'GURU') {
    const g = await prisma.masterGuru.findFirst({ where: { userId: user.id } });
    if (g) return { guruId: g.id };
  }
  return {};
}

// ---------- Overview ----------
async function getOverview(prisma) {
  const [siswaAktif, siswaSelesai, totalDudi, totalGuru, totalInstruktur, penempatanAktif] = await Promise.all([
    prisma.masterSiswa.count({ where: { status: 'AKTIF' } }),
    prisma.masterSiswa.count({ where: { status: 'SELESAI' } }),
    prisma.masterDudi.count(),
    prisma.masterGuru.count(),
    prisma.masterInstruktur.count(),
    prisma.penempatanPkl.count({ where: { status: 'AKTIF' } }),
  ]);
  const groups = await prisma.masterSiswa.groupBy({ by: ['jurusanId'], _count: { jurusanId: true } });
  const jurusan = await prisma.masterJurusan.findMany();
  const namaById = Object.fromEntries(jurusan.map((j) => [j.id, `${j.kode} - ${j.nama}`]));
  const distribusi = groups.map((g) => ({
    jurusanId: g.jurusanId,
    jurusan: g.jurusanId ? namaById[g.jurusanId] || `#${g.jurusanId}` : 'Tanpa jurusan',
    total: g._count.jurusanId,
  })).sort((a, b) => b.total - a.total);
  return { siswaAktif, siswaSelesai, totalSiswa: siswaAktif + siswaSelesai, totalDudi, totalGuru, totalInstruktur, penempatanAktif, distribusi };
}

async function getDudiMap(prisma) {
  const dudi = await prisma.masterDudi.findMany({
    include: { penempatan: { where: { status: 'AKTIF' }, include: { siswa: true, guru: true } } },
    orderBy: { id: 'asc' },
  });
  return dudi.map((d) => ({
    id: d.id, nama: d.nama, alamat: d.alamat, latitude: d.latitude, longitude: d.longitude, kuota: d.kuota,
    jumlahSiswa: d.penempatan.length,
    guru: [...new Set(d.penempatan.map((p) => p.guru?.nama).filter(Boolean))],
    siswa: d.penempatan.map((p) => p.siswa?.nama).filter(Boolean).slice(0, 10),
  }));
}

// ---------- Kehadiran ----------
async function getKehadiran(prisma, user, { from, to }) {
  const scope = await guidedWhere(prisma, user);
  let penIds = null;
  if (scope.guruId) {
    const pl = await prisma.penempatanPkl.findMany({ where: { guruId: scope.guruId }, select: { id: true } });
    penIds = pl.map((x) => x.id);
  }
  const where = {};
  if (from || to) {
    where.tanggal = {};
    if (from) where.tanggal.gte = new Date(from);
    if (to) where.tanggal.lte = new Date(to);
  } else {
    where.tanggal = { gte: new Date(Date.now() - 30 * 86400000) };
  }
  if (penIds) where.penempatanId = { in: penIds.length ? penIds : [-1] };
  const rows = await prisma.presensiKesehatan.findMany({ where, select: { statusKehadiran: true, kondisiKesehatan: true, tanggal: true } });
  const byStatus = { HADIR: 0, IZIN: 0, SAKIT: 0, ALPHA: 0 };
  const byKondisi = { SEHAT: 0, SAKIT_RINGAN: 0, BUTUH_PENANGANAN: 0 };
  const byDay = {};
  for (const r of rows) {
    byStatus[r.statusKehadiran] = (byStatus[r.statusKehadiran] || 0) + 1;
    byKondisi[r.kondisiKesehatan] = (byKondisi[r.kondisiKesehatan] || 0) + 1;
    const day = new Date(r.tanggal).toISOString().slice(0, 10);
    byDay[day] = byDay[day] || { tanggal: day, HADIR: 0, IZIN: 0, SAKIT: 0, ALPHA: 0 };
    byDay[day][r.statusKehadiran] += 1;
  }
  const total = rows.length;
  const pct = Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, toPercent(v, total)]));
  return { total, byStatus, byKondisi, pct, harian: Object.values(byDay).sort((a, b) => a.tanggal.localeCompare(b.tanggal)) };
}

// ---------- DUDI terbaik ----------
async function getDudiTerbaik(prisma, user, limit = 10) {
  const scope = await guidedWhere(prisma, user);
  const placements = await prisma.penempatanPkl.findMany({
    where: { ...(scope.guruId ? { guruId: scope.guruId } : {}) },
    include: { dudi: true, jurnal: { select: { nilaiGuru: true } }, presensi: { select: { statusKehadiran: true } } },
  });
  const agg = {};
  for (const p of placements) {
    const id = p.dudiId;
    agg[id] = agg[id] || { dudiId: id, nama: p.dudi?.nama || `#${id}`, siswaCount: 0, nilaiSum: 0, nilaiCount: 0, jurnalCount: 0 };
    agg[id].siswaCount += 1;
    for (const j of p.jurnal) {
      agg[id].jurnalCount += 1;
      if (j.nilaiGuru != null) { agg[id].nilaiSum += j.nilaiGuru; agg[id].nilaiCount += 1; }
    }
  }
  return Object.values(agg).map((a) => {
    const avgNilai = a.nilaiCount ? Math.round((a.nilaiSum / a.nilaiCount) * 10) / 10 : 0;
    const avgJurnal = a.siswaCount ? a.jurnalCount / a.siswaCount : 0;
    return { ...a, avgNilai, avgJurnalPerSiswa: Math.round(avgJurnal * 10) / 10, skor: calcDudiScore(avgNilai, avgJurnal) };
  }).sort((a, b) => b.skor - a.skor).slice(0, limit);
}

// ---------- Leaderboard nilai ----------
async function getNilaiTertinggi(prisma, user, limit = 10) {
  const scope = await guidedWhere(prisma, user);
  const groups = await prisma.jurnalHarian.groupBy({
    by: ['penempatanId'],
    where: { nilaiGuru: { not: null } },
    _avg: { nilaiGuru: true }, _count: { nilaiGuru: true },
  });
  const penIds = groups.map((g) => g.penempatanId);
  const pens = await prisma.penempatanPkl.findMany({
    where: { id: { in: penIds.length ? penIds : [-1] }, ...(scope.guruId ? { guruId: scope.guruId } : {}) },
    include: { siswa: true, dudi: true },
  });
  const penById = Object.fromEntries(pens.map((p) => [p.id, p]));
  return groups
    .filter((g) => penById[g.penempatanId])
    .map((g) => ({
      penempatanId: g.penempatanId,
      siswa: penById[g.penempatanId].siswa?.nama || `#${g.penempatanId}`,
      dudi: penById[g.penempatanId].dudi?.nama || '-',
      avgNilai: Math.round(g._avg.nilaiGuru * 10) / 10,
      jumlahDinilai: g._count.nilaiGuru,
    }))
    .sort((a, b) => b.avgNilai - a.avgNilai || b.jumlahDinilai - a.jumlahDinilai)
    .slice(0, limit);
}

// ---------- Terajin ----------
async function getTerajin(prisma, user, limit = 10) {
  const scope = await guidedWhere(prisma, user);
  const placements = await prisma.penempatanPkl.findMany({
    where: { status: 'AKTIF', ...(scope.guruId ? { guruId: scope.guruId } : {}) },
    include: {
      siswa: true, dudi: true,
      jurnal: { select: { tanggal: true, createdAt: true } },
      presensi: { select: { statusKehadiran: true } },
    },
  });
  return placements.map((p) => {
    const total = p.presensi.length;
    const hadir = p.presensi.filter((x) => x.statusKehadiran === 'HADIR').length;
    const hadirPct = toPercent(hadir, total);
    const onTime = p.jurnal.filter((j) => sameDayOrNext(j.tanggal, j.createdAt)).length;
    const onTimePct = toPercent(onTime, p.jurnal.length);
    return {
      penempatanId: p.id, siswa: p.siswa?.nama || `#${p.id}`, dudi: p.dudi?.nama || '-',
      hadirPct, onTimePct, totalPresensi: total, totalJurnal: p.jurnal.length,
      skor: calcRajinScore(hadirPct, onTimePct),
    };
  }).filter((x) => x.totalPresensi > 0 || x.totalJurnal > 0)
    .sort((a, b) => b.skor - a.skor).slice(0, limit);
}

// ---------- Early warning ----------
async function getBermasalah(prisma, user, limit = 50) {
  const scope = await guidedWhere(prisma, user);
  const today = new Date();
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const placements = await prisma.penempatanPkl.findMany({
    where: { status: 'AKTIF', ...(scope.guruId ? { guruId: scope.guruId } : {}) },
    include: {
      siswa: true, dudi: true,
      jurnal: { select: { tanggal: true }, orderBy: { tanggal: 'desc' }, take: 1 },
      presensi: { select: { statusKehadiran: true, kondisiKesehatan: true, tanggal: true } },
    },
  });
  const out = [];
  for (const p of placements) {
    const lastTgl = p.jurnal[0]?.tanggal ? new Date(p.jurnal[0].tanggal) : new Date(p.tanggalMulai);
    const daysSince = dayDiff(lastTgl, today);
    const total = p.presensi.length;
    const hadir = p.presensi.filter((x) => x.statusKehadiran === 'HADIR').length;
    const alpha = p.presensi.filter((x) => x.statusKehadiran === 'ALPHA').length;
    const sakitBerat = p.presensi.some((x) => x.kondisiKesehatan === 'BUTUH_PENANGANAN' && new Date(x.tanggal) >= weekAgo);
    const reasons = flagBermasalah({ daysSinceLastJurnal: daysSince, hadirRate: toPercent(hadir, total), presensiTotal: total, alphaCount: alpha, sakitBerat7d: sakitBerat });
    if (reasons.length) {
      out.push({
        penempatanId: p.id, siswa: p.siswa?.nama || `#${p.id}`, dudi: p.dudi?.nama || '-',
        reasons, daysSinceLastJurnal: daysSince, hadirRate: toPercent(hadir, total), alphaCount: alpha,
      });
    }
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length || b.daysSinceLastJurnal - a.daysSinceLastJurnal).slice(0, limit);
}

// ---------- Feed teraktif ----------
async function getJurnalTeraktif(prisma, user, limit = 20) {
  const scope = await guidedWhere(prisma, user);
  let penIds = null;
  if (scope.guruId) {
    const pl = await prisma.penempatanPkl.findMany({ where: { guruId: scope.guruId }, select: { id: true } });
    penIds = pl.map((x) => x.id);
  }
  return prisma.jurnalHarian.findMany({
    where: penIds ? { penempatanId: { in: penIds.length ? penIds : [-1] } } : {},
    orderBy: { updatedAt: 'desc' }, take: Math.min(50, Math.max(1, limit)),
    include: { penempatan: { include: { siswa: true, dudi: true } } },
  });
}

// ---------- Export CSV (Excel-compatible) ----------
async function exportCsv(prisma, user, { type, from, to }) {
  const range = {};
  if (from || to) {
    range.tanggal = {};
    if (from) range.tanggal.gte = new Date(from);
    if (to) range.tanggal.lte = new Date(to);
  }
  if (type === 'jurnal') {
    const rows = await prisma.jurnalHarian.findMany({
      where: range, take: 5000, orderBy: { tanggal: 'asc' },
      include: { penempatan: { include: { siswa: true, dudi: true, guru: true } } },
    });
    const cols = ['id', 'tanggal', 'siswa', 'dudi', 'guru', 'jam', 'nilai', 'status'];
    return buildCsv(cols, rows.map((j) => ({
      id: j.id, tanggal: new Date(j.tanggal).toISOString().slice(0, 10),
      siswa: j.penempatan?.siswa?.nama || '', dudi: j.penempatan?.dudi?.nama || '', guru: j.penempatan?.guru?.nama || '',
      jam: `${j.jamMulai}-${j.jamSelesai}`, nilai: j.nilaiGuru ?? '', status: j.statusVerifikasi,
    })));
  }
  if (type === 'presensi') {
    const rows = await prisma.presensiKesehatan.findMany({
      where: range, take: 5000, orderBy: { tanggal: 'asc' },
      include: { penempatan: { include: { siswa: true, dudi: true } } },
    });
    const cols = ['id', 'tanggal', 'siswa', 'dudi', 'kehadiran', 'kesehatan'];
    return buildCsv(cols, rows.map((p) => ({
      id: p.id, tanggal: new Date(p.tanggal).toISOString().slice(0, 10),
      siswa: p.penempatan?.siswa?.nama || '', dudi: p.penempatan?.dudi?.nama || '',
      kehadiran: p.statusKehadiran, kesehatan: p.kondisiKesehatan,
    })));
  }
  const rows = await prisma.penempatanPkl.findMany({
    take: 5000, orderBy: { id: 'asc' },
    include: { siswa: true, dudi: true, guru: true },
  });
  const cols = ['id', 'siswa', 'dudi', 'guru', 'mulai', 'selesai', 'status'];
  return buildCsv(cols, rows.map((p) => ({
    id: p.id, siswa: p.siswa?.nama || '', dudi: p.dudi?.nama || '', guru: p.guru?.nama || '',
    mulai: new Date(p.tanggalMulai).toISOString().slice(0, 10),
    selesai: new Date(p.tanggalSelesai).toISOString().slice(0, 10), status: p.status,
  })));
}

module.exports = {
  toPercent, dayDiff, calcDudiScore, calcRajinScore, flagBermasalah, escapeCsv, buildCsv, sameDayOrNext,
  getOverview, getDudiMap, getKehadiran, getDudiTerbaik, getNilaiTertinggi, getTerajin, getBermasalah, getJurnalTeraktif, exportCsv,
};
