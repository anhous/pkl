'use strict';
// Smoke Tahap 2 tanpa DB: validator Zod + pure rules penempatan/sync.
// Jalankan: npm run test:tahap2 --workspace=apps/api
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-karakter-xxxxxx';
process.env.NODE_ENV = 'test';

const assert = require('assert');
const v = require('../src/modules/master/master.validators');
const pv = require('../src/modules/penempatan/penempatan.validators');
const { assertDateRange, hasQuotaSlot } = require('../src/modules/penempatan/penempatan.service');
const { syncRunSchema, buildSyncMessage, ENTITIES } = require('../src/modules/sync/sync.validators');
const { parsePagination, buildMeta } = require('../src/utils/pagination');

(async () => {
  // Master validators
  assert(v.jurusanCreate.parse({ kode: 'RPL', nama: 'Rekayasa Perangkat Lunak' }));
  assert.throws(() => v.jurusanCreate.parse({ kode: '', nama: 'x' }));
  assert(v.siswaCreate.parse({ nisn: '123', nama: 'Adi', kelas: 'XII RPL 1' }));
  assert.throws(() => v.dudiCreate.parse({ nama: 'PT X', alamat: 'Jl', kuota: -1 }));
  assert(v.dudiCreate.parse({ nama: 'PT X', alamat: 'Jl', kuota: 10, latitude: -6.2, longitude: 106.8 }));

  // Penempatan validators + rules
  assert(pv.penempatanCreate.parse({ siswaId: 1, dudiId: 2, tanggalMulai: '2026-01-05', tanggalSelesai: '2026-04-05' }));
  assertDateRange('2026-01-05', '2026-04-05');
  assert.throws(() => assertDateRange('2026-04-05', '2026-01-05'), /tidak boleh setelah/);
  assert.strictEqual(hasQuotaSlot(2, 5), true);
  assert.strictEqual(hasQuotaSlot(5, 5), false);
  assert.strictEqual(hasQuotaSlot(99, 0), true); // 0 = unlimited

  // Sync stub
  assert(ENTITIES.includes('siswa') && ENTITIES.includes('jurusan'));
  const parsed = syncRunSchema.parse({ sourceApp: 'DAPODIK', payload: [{ nisn: '1' }] });
  assert.strictEqual(parsed.sourceApp, 'DAPODIK');
  assert.ok(buildSyncMessage('siswa', 1, 'DAPODIK').includes('belum ada mutasi'));

  // Pagination
  assert.deepStrictEqual(parsePagination({ page: '2', limit: '10', search: ' rpl ' }), { page: 2, limit: 10, search: 'rpl', order: 'asc', skip: 10 });
  assert.deepStrictEqual(buildMeta({ page: 2, limit: 10, total: 95 }), { page: 2, limit: 10, total: 95, totalPages: 10 });

  // eslint-disable-next-line no-console
  console.log('[smoke] tahap2 master+penempatan+sync OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] TAHAP2 GAGAL', e);
  process.exit(1);
});
