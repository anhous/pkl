'use strict';
// Smoke Tahap 4 tanpa DB. Jalankan: npm run test:tahap4 --workspace=apps/api
process.env.NODE_ENV = 'test';

const assert = require('assert');
const svc = require('../src/modules/analitik/analitik.service');

(async () => {
  assert.strictEqual(svc.toPercent(1, 4), 25);
  assert.strictEqual(svc.toPercent(0, 0), 0);
  assert.strictEqual(svc.toPercent(1, 3), 33.3);

  // Skor DUDI: nilai dominan
  assert(svc.calcDudiScore(90, 5) > svc.calcDudiScore(70, 5));
  assert.strictEqual(svc.calcDudiScore(0, 0), 0);
  assert(svc.calcDudiScore(100, 99) <= 100);

  // Skor rajin 50/50
  assert.strictEqual(svc.calcRajinScore(100, 100), 100);
  assert.strictEqual(svc.calcRajinScore(80, 60), 70);

  // Early warning
  assert.deepStrictEqual(svc.flagBermasalah({ daysSinceLastJurnal: 1, hadirRate: 100, presensiTotal: 10, alphaCount: 0, sakitBerat7d: false }), []);
  assert.ok(svc.flagBermasalah({ daysSinceLastJurnal: 5, hadirRate: 100, presensiTotal: 10, alphaCount: 0, sakitBerat7d: false }).join().includes('JURNAL_MACET'));
  assert.ok(svc.flagBermasalah({ daysSinceLastJurnal: 0, hadirRate: 50, presensiTotal: 10, alphaCount: 0, sakitBerat7d: false }).join().includes('ABSEN_TINGGI'));
  assert.ok(svc.flagBermasalah({ daysSinceLastJurnal: 0, hadirRate: 100, presensiTotal: 10, alphaCount: 3, sakitBerat7d: false }).join().includes('ALPHA'));
  assert.ok(svc.flagBermasalah({ daysSinceLastJurnal: 0, hadirRate: 100, presensiTotal: 1, alphaCount: 0, sakitBerat7d: true }).join().includes('SAKIT_BERAT'));

  // Tepat waktu H+1
  assert.strictEqual(svc.sameDayOrNext('2026-02-01', '2026-02-01T20:00:00Z'), true);
  assert.strictEqual(svc.sameDayOrNext('2026-02-01', '2026-02-05T00:00:00Z'), false);

  // CSV escape
  assert.strictEqual(svc.escapeCsv('PT "Maju", Jaya'), '"PT ""Maju"", Jaya"');
  const csv = svc.buildCsv(['a', 'b'], [{ a: 1, b: 'x,y' }, { a: 2, b: 'z' }]);
  assert.strictEqual(csv, 'a,b\n1,"x,y"\n2,z');

  // eslint-disable-next-line no-console
  console.log('[smoke] tahap4 analitik OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] TAHAP4 GAGAL', e);
  process.exit(1);
});
