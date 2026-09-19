'use strict';
// Smoke webhook SDMS tanpa DB (prisma di-fake) & tanpa jaringan.
// Jalankan: npm run test:webhook --workspace=apps/api
process.env.NODE_ENV = 'test';

const assert = require('assert');
const crypto = require('crypto');
const { computeHex, verifySignature, dispatchEvent } = require('../src/modules/sync/sync.webhook');

const SECRET = 'uji-secret-webhook';

function fakePrisma() {
  const db = { siswa: {}, guru: {}, jurusan: {}, logs: [] };
  return {
    _db: db,
    masterSiswa: {
      findUnique: async ({ where }) => db.siswa[where.nisn] || Object.values(db.siswa).find((r) => r.id === where.id) || null,
      create: async ({ data }) => { db.siswa[data.nisn] = { id: Object.keys(db.siswa).length + 1, status: 'AKTIF', ...data }; return db.siswa[data.nisn]; },
      update: async ({ where, data }) => { const r = db.siswa[where.nisn] || Object.values(db.siswa).find((x) => x.id === where.id); Object.assign(r, data); return r; },
    },
    masterGuru: {
      findUnique: async ({ where }) => db.guru[where.nip] || null,
      create: async ({ data }) => { db.guru[data.nip] = { id: 1, ...data }; return db.guru[data.nip]; },
      update: async ({ where, data }) => { Object.assign(db.guru[where.nip], data); return db.guru[where.nip]; },
    },
    masterJurusan: {
      findUnique: async ({ where }) => db.jurusan[where.kode] || null,
      create: async ({ data }) => { db.jurusan[data.kode] = { id: 1, ...data }; return db.jurusan[data.kode]; },
      update: async ({ where, data }) => { Object.assign(db.jurusan[where.kode], data); return db.jurusan[where.kode]; },
    },
  };
}

(async () => {
  // HMAC vector (format doc: hex atas raw bytes)
  const raw = Buffer.from(JSON.stringify({ event: 'siswa.created', payload: { nisn: '001' } }));
  const sig = computeHex(SECRET, raw);
  assert.strictEqual(sig, crypto.createHmac('sha256', SECRET).update(raw).digest('hex'));
  assert.strictEqual(verifySignature(SECRET, sig, [raw]), true);
  assert.strictEqual(verifySignature(SECRET, 'salah', [raw]), false);
  assert.strictEqual(verifySignature('', sig, [raw]), false);
  assert.strictEqual(verifySignature(SECRET, sig, [Buffer.from('beda')]), false);
  // fallback stringify (contoh Node di doc)
  assert.strictEqual(verifySignature(SECRET, computeHex(SECRET, raw), [Buffer.from('x'), raw]), true);

  const prisma = fakePrisma();

  // siswa.created ala INTEGRATION.md (uuid + NISN + kelas_id)
  let r = await dispatchEvent(prisma, 'siswa.created', {
    id: 'uuid-siswa', nama: 'Ahmad Fauzi', nisn: '0085590240', nis: '2024001',
    jenis_kelamin: 'L', jurusan_id: 'uuid-jurusan', kelas_id: 'uuid-kelas', status: 'Aktif',
  });
  assert.strictEqual(r.action, 'created');
  assert.strictEqual(prisma._db.siswa['0085590240'].nama, 'Ahmad Fauzi');

  r = await dispatchEvent(prisma, 'siswa.updated', { nisn: '0085590240', nama: 'Ahmad F.', no_telepon: '081' });
  assert.strictEqual(r.action, 'updated');
  assert.strictEqual(prisma._db.siswa['0085590240'].kontak, '081');

  r = await dispatchEvent(prisma, 'siswa.deleted', { nisn: '0085590240' });
  assert.strictEqual(r.action, 'deactivated');
  assert.strictEqual(prisma._db.siswa['0085590240'].status, 'KELUAR');

  r = await dispatchEvent(prisma, 'siswa.created', { nama: 'Tanpa NISN' });
  assert.strictEqual(r.action, 'skipped');

  r = await dispatchEvent(prisma, 'guru.created', { nip: '1980', nama_lengkap: 'Bu Guru', mata_pelajaran: 'MTK' });
  assert.strictEqual(r.action, 'created');
  assert.strictEqual(prisma._db.guru['1980'].kompetensi, 'MTK');

  r = await dispatchEvent(prisma, 'guru.deleted', { nip: '1980' });
  assert.strictEqual(r.action, 'skipped'); // tanpa hapus (dirujuk penempatan)

  const { upsertJurusan } = require('../src/modules/sync/sync.engine');
  r = await dispatchEvent(prisma, 'jurusan.created', { kode_jurusan: 'RPL', nama_jurusan: 'RPL' }, { upserts: { upsertJurusan } });
  assert.strictEqual(r.action, 'created');

  r = await dispatchEvent(prisma, 'kelas.created', { nama_kelas: 'XII RPL 1' });
  assert.strictEqual(r.handled, false); // 200 + skip, tanpa tabel lokal

  r = await dispatchEvent(prisma, 'bulk.sync', {});
  assert.strictEqual(r.action, 'bulk');

  // eslint-disable-next-line no-console
  console.log('[smoke] webhook sdms OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] WEBHOOK GAGAL', e);
  process.exit(1);
});
