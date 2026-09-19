'use strict';
const { normalizeList, mapJurusan, mapSiswa, mapGuru, mapJurnalPush } = require('./mappers');

// Entity yang ditarik DARI SDMS. DUDI & instruktur TIDAK ada di SDMS → milik lokal PKL.
const SDMS_PULL_ENTITIES = {
  jurusan: { path: '/master/jurusan' },
  siswa: { path: '/master/siswa' },
  guru: { path: '/master/guru' },
};

function sdmsSource() {
  return 'SDMS';
}

async function withLog(prisma, { sourceApp, endpoint }, fn) {
  const log = await prisma.syncLog.create({
    data: { sourceApp, endpoint, status: 'BERJALAN', message: 'Mulai', recordCount: 0 },
  });
  try {
    const { recordCount, message } = await fn();
    return await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'SUKSES', message, recordCount } });
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'GAGAL', message: String(e.message || e).slice(0, 2000) } });
    throw e;
  }
}

async function upsertJurusan(prisma, m) {
  const found = await prisma.masterJurusan.findUnique({ where: { kode: m.kode } });
  if (found) {
    if (found.nama !== m.nama) await prisma.masterJurusan.update({ where: { id: found.id }, data: { nama: m.nama } });
    return 'updated';
  }
  await prisma.masterJurusan.create({ data: m });
  return 'created';
}

async function upsertSiswa(prisma, m) {
  if (!m.nisn) return 'skipped';
  let jurusanId = null;
  if (m.jurusanKode) {
    const j = await prisma.masterJurusan.findUnique({ where: { kode: m.jurusanKode } });
    if (j) jurusanId = j.id;
  }
  const data = { nisn: m.nisn, nama: m.nama, kelas: m.kelas, kontak: m.kontak, ...(jurusanId ? { jurusanId } : {}) };
  const found = await prisma.masterSiswa.findUnique({ where: { nisn: m.nisn } });
  if (found) {
    await prisma.masterSiswa.update({ where: { id: found.id }, data });
    return 'updated';
  }
  await prisma.masterSiswa.create({ data });
  return 'created';
}

async function upsertGuru(prisma, m) {
  const found = await prisma.masterGuru.findUnique({ where: { nip: m.nip } });
  const data = { nip: m.nip, nama: m.nama, kompetensi: m.kompetensi, kontak: m.kontak };
  if (found) {
    await prisma.masterGuru.update({ where: { id: found.id }, data });
    return 'updated';
  }
  await prisma.masterGuru.create({ data });
  return 'created';
}

const UPSERTERS = { jurusan: upsertJurusan, siswa: upsertSiswa, guru: upsertGuru };
const MAPPERS = { jurusan: mapJurusan, siswa: mapSiswa, guru: mapGuru };

// Pull 1 entity dari SDMS → upsert lokal. Dipakai tombol Manual Sync + cron.
async function pullEntity(prisma, client, entity) {
  const def = SDMS_PULL_ENTITIES[entity];
  if (!def) {
    const e = new Error(`Entity ${entity} tidak tersedia di SDMS (DUDI/instruktur milik lokal PKL)`);
    e.status = 400;
    throw e;
  }
  return withLog(prisma, { sourceApp: sdmsSource(), endpoint: `SDMS GET ${def.path}` }, async () => {
    const raw = await client.pullAll(def.path);
    const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
    for (const r of raw) {
      try {
        const s = await UPSERTERS[entity](prisma, MAPPERS[entity](r));
        stats[s] = (stats[s] || 0) + 1;
      } catch {
        stats.failed += 1;
      }
    }
    const total = raw.length;
    return {
      recordCount: total,
      message: `Pull ${entity} dari SDMS: ${total} ditarik — ${stats.created} baru, ${stats.updated} diperbarui, ${stats.skipped} dilewati, ${stats.failed} gagal`,
    };
  });
}

async function pullAll(prisma, client) {
  const out = {};
  for (const entity of Object.keys(SDMS_PULL_ENTITIES)) {
    try {
      out[entity] = await pullEntity(prisma, client, entity);
    } catch (e) {
      out[entity] = { error: e.message };
    }
  }
  return out;
}

// Push jurnal terbaru ke SDMS gateway (kanal resmi app satelit).
async function pushJurnal(prisma, client, { limit = 100, since } = {}) {
  return withLog(prisma, { sourceApp: 'PKL', endpoint: 'SDMS POST /gateway/jurnal/sync' }, async () => {
    const where = since ? { updatedAt: { gte: new Date(since) } } : {};
    const rows = await prisma.jurnalHarian.findMany({
      where, take: Math.min(500, Math.max(1, limit)), orderBy: { updatedAt: 'desc' },
      include: { penempatan: { include: { siswa: true, dudi: true } } },
    });
    if (!rows.length) return { recordCount: 0, message: 'Tidak ada jurnal untuk di-push ke SDMS' };
    const payload = { source: 'jurnal-pkl', count: rows.length, items: rows.map(mapJurnalPush) };
    const res = await client.pushJurnal(payload);
    return { recordCount: rows.length, message: `Push ${rows.length} jurnal ke SDMS sukses (${JSON.stringify(res).slice(0, 300)})` };
  });
}

async function lastLogsBySource(prisma, sourceApp, take = 5) {
  return prisma.syncLog.findMany({ where: { sourceApp }, take, orderBy: { id: 'desc' } });
}

module.exports = { SDMS_PULL_ENTITIES, pullEntity, pullAll, pushJurnal, lastLogsBySource, upsertJurusan, upsertSiswa, upsertGuru };
