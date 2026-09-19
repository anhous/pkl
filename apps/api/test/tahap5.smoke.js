'use strict';
// Smoke Tahap 5 tanpa DB & tanpa jaringan (fetch di-mock).
// Jalankan: npm run test:tahap5 --workspace=apps/api
process.env.NODE_ENV = 'test';

const assert = require('assert');
const { SdmsClient } = require('../src/modules/sync/sdms.client');
const { pick, normalizeList, mapJurusan, mapSiswa, mapGuru, mapJurnalPush } = require('../src/modules/sync/mappers');
const { SDMS_PULL_ENTITIES } = require('../src/modules/sync/sync.engine');

const ok = (data) => async () => ({ ok: true, status: 200, json: async () => data });

(async () => {
  // pick fallback case-insensitive
  assert.strictEqual(pick({ NISN: '123' }, ['nisn', 'nis']), '123');
  assert.strictEqual(pick({ nama_lengkap: ' Budi ' }, ['nama_lengkap', 'nama']), ' Budi ');

  // envelope
  assert.deepStrictEqual(normalizeList([1, 2]).rows, [1, 2]);
  assert.deepStrictEqual(normalizeList({ data: [1] }).rows, [1]);
  assert.deepStrictEqual(normalizeList({ data: { data: [1, 2], meta: { last_page: 5 } } }), { rows: [1, 2], meta: { last_page: 5 } });
  assert.deepStrictEqual(normalizeList({ data: { a: 1 } }).rows, []);

  // mapper variasi key
  assert.deepStrictEqual(mapJurusan({ kode_jurusan: 'RPL', nama_jurusan: 'Rekayasa PL' }), { kode: 'RPL', nama: 'Rekayasa PL' });
  const s1 = mapSiswa({ NISN: '001', nama_lengkap: 'Ani', rombel: 'XII RPL 1', no_hp: '081' });
  assert.strictEqual(s1.nisn, '001');
  assert.strictEqual(s1.kelas, 'XII RPL 1');
  const s2 = mapSiswa({ nisn: '002', nama: 'Budi', kelas: 'XI TKJ 2' });
  assert.strictEqual(s2.nama, 'Budi');
  assert.strictEqual(mapSiswa({ nama: 'X' }).nisn, undefined); // tanpa NISN → skipped saat upsert
  const g = mapGuru({ NIP: '1980', nama: 'Pak Guru', mapel: 'Produktif RPL' });
  assert.strictEqual(g.nip, '1980');
  assert.strictEqual(g.kompetensi, 'Produktif RPL');

  // entity didukung
  assert.deepStrictEqual(Object.keys(SDMS_PULL_ENTITIES).sort(), ['guru', 'jurusan', 'siswa']);
  assert(!('dudi' in SDMS_PULL_ENTITIES) && !('instruktur' in SDMS_PULL_ENTITIES));

  // client belum dikonfigurasi
  const bare = new SdmsClient({});
  assert.strictEqual(bare.configured, false);
  await assert.rejects(() => bare.request('GET', '/master/siswa'), /belum dikonfigurasi/);

  // login + auto header
  const calls = [];
  const mockFetch = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization });
    if (url.endsWith('/auth/login')) return ok({ data: { access_token: 'AT', refresh_token: 'RT', user: { id: 1 } } })();
    return ok({ data: [{ id: 1 }] })();
  };
  const c = new SdmsClient({ baseUrl: 'http://x', username: 'u', password: 'p', fetchImpl: mockFetch });
  const r = await c.request('GET', '/master/jurusan');
  assert.deepStrictEqual(r, { data: [{ id: 1 }] });
  assert.strictEqual(calls[1].auth, 'Bearer AT');

  // 401 → refresh → retry (meniru interceptor SDMS)
  let n = 0;
  const mock401 = async (url) => {
    n += 1;
    if (url.endsWith('/auth/login')) return ok({ data: { access_token: 'A1', refresh_token: 'R1' } })();
    if (url.endsWith('/auth/refresh')) return ok({ data: { access_token: 'A2' } })();
    if (n === 2) return { ok: false, status: 401, json: async () => ({ message: 'Unauthenticated' }) };
    return ok({ data: { ok: true } })();
  };
  const c2 = new SdmsClient({ baseUrl: 'http://x', username: 'u', password: 'p', fetchImpl: mock401 });
  assert.deepStrictEqual(await c2.request('GET', '/gateway/jurnal/test'), { data: { ok: true } });
  assert.strictEqual(c2.accessToken, 'A2');

  // pullAll pagination via meta.last_page
  const pages = { 1: [1, 2], 2: [3] };
  const mockPages = async (url) => {
    const u = new URL(url);
    const pg = Number(u.searchParams.get('page'));
    return ok({ data: { data: pages[pg] || [], meta: { last_page: 2 } } })();
  };
  const c3 = new SdmsClient({ baseUrl: 'http://x', username: 'u', password: 'p', fetchImpl: mockPages });
  c3.accessToken = 'T';
  assert.deepStrictEqual(await c3.pullAll('/master/siswa', { perPage: 2 }), [1, 2, 3]);

  // payload push jurnal
  const push = mapJurnalPush({
    id: 7, tanggal: '2026-03-01T00:00:00.000Z', jamMulai: '08:00', jamSelesai: '15:00',
    deskripsi: 'Service printer', fotoUrl: '/u/1.jpg', nilaiGuru: 90, catatanGuru: 'Baik',
    statusVerifikasi: 'DISETUJUI', updatedAt: '2026-03-02T10:00:00.000Z',
    penempatan: { siswa: { nisn: '001', nama: 'Ani' }, dudi: { nama: 'PT Maju' } },
  });
  assert.strictEqual(push.external_id, 7);
  assert.strictEqual(push.tanggal, '2026-03-01');
  assert.strictEqual(push.siswa.nisn, '001');

  // eslint-disable-next-line no-console
  console.log('[smoke] tahap5 sdms-sync OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] TAHAP5 GAGAL', e);
  process.exit(1);
});
