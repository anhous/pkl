'use strict';
// Smoke Tahap 3 tanpa DB. Jalankan: npm run test:tahap3 --workspace=apps/api
process.env.NODE_ENV = 'test';

const assert = require('assert');
const { jurnalCreate, jurnalUpdate, nilaiSchema, fotoExt } = require('../src/modules/jurnal/jurnal.validators');
const { assertJamRange, canSiswaEdit, assertNilai } = require('../src/modules/jurnal/jurnal.service');
const { presensiCreate } = require('../src/modules/presensi/presensi.validators');
const { assertKonsistensi } = require('../src/modules/presensi/presensi.service');

(async () => {
  assert(jurnalCreate.parse({ penempatanId: 1, tanggal: '2026-02-01', jamMulai: '08:00', jamSelesai: '16:00', deskripsi: 'Membuat laporan kegiatan harian PKL' }));
  assert.throws(() => jurnalCreate.parse({ penempatanId: 1, tanggal: '2026-02-01', jamMulai: '8 pagi', jamSelesai: '16:00', deskripsi: 'cukup panjang deskripsinya' }), /Format jam/);
  assert.throws(() => jurnalCreate.parse({ penempatanId: 1, tanggal: '2026-02-01', jamMulai: '08:00', jamSelesai: '16:00', deskripsi: 'pendek' }), /Too small|too_small/i);
  assert(jurnalUpdate.parse({ deskripsi: 'Revisi deskripsi yang cukup panjang' }));

  assertJamRange('08:00', '16:00');
  assert.throws(() => assertJamRange('16:00', '08:00'), /harus sebelum/);
  assert.throws(() => assertJamRange('10:00', '10:00'), /harus sebelum/);

  assert.strictEqual(canSiswaEdit('MENUNGGU'), true);
  assert.strictEqual(canSiswaEdit('REVISI'), true);
  assert.strictEqual(canSiswaEdit('DIPERIKSA'), false);
  assert.strictEqual(canSiswaEdit('DISETUJUI'), false);

  assert(nilaiSchema.parse({ nilaiGuru: 85, catatanGuru: 'Bagus', statusVerifikasi: 'DISETUJUI' }));
  assert.throws(() => nilaiSchema.parse({ nilaiGuru: 0 }), /greater|too_small|>=/i);
  assert.throws(() => nilaiSchema.parse({ nilaiGuru: 101 }), /less|too_big|<=/i);
  assertNilai(100);
  assert.throws(() => assertNilai(0), /1-100/);

  assert.strictEqual(fotoExt('image/png'), 'jpg');
  assert.strictEqual(fotoExt('image/jpeg'), 'jpg');

  assert(presensiCreate.parse({ penempatanId: 1, tanggal: '2026-02-01', statusKehadiran: 'HADIR', kondisiKesehatan: 'SEHAT' }));
  assert.throws(() => presensiCreate.parse({ penempatanId: 1, tanggal: '2026-02-01', statusKehadiran: 'HADIR', kondisiKesehatan: 'FLU' }));
  assertKonsistensi('HADIR', 'SEHAT');
  assert.throws(() => assertKonsistensi('SAKIT', 'SEHAT'), /Konsistensi/);

  // eslint-disable-next-line no-console
  console.log('[smoke] tahap3 jurnal+presensi+nilai OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] TAHAP3 GAGAL', e);
  process.exit(1);
});
