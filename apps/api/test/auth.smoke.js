'use strict';
// Smoke test tanpa DB: bcrypt + JWT + RBAC matrix. Jalankan: npm run test:auth --workspace=apps/api
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-karakter-xxxxxx';
process.env.NODE_ENV = 'test';

const assert = require('assert');
const { hashPassword, verifyPassword } = require('../src/utils/password');
const { signAccessToken, verifyToken } = require('../src/utils/jwt');
const { can, ROLES } = require('../../../packages/shared/src/rbac');

(async () => {
  const hash = await hashPassword('Password123!');
  assert(await verifyPassword('Password123!', hash), 'bcrypt verify gagal');
  assert(!(await verifyPassword('salah', hash)), 'bcrypt harus menolak password salah');

  const token = signAccessToken({ sub: 1, role: ROLES.GURU });
  const dec = verifyToken(token);
  assert.strictEqual(dec.sub, 1);
  assert.strictEqual(dec.role, 'GURU');

  assert(can('GURU', 'jurnal:nilai'), 'GURU harus bisa menilai');
  assert(!can('SISWA', 'jurnal:nilai'), 'SISWA tidak boleh menilai');
  assert(can('SISWA', 'jurnal:create'), 'SISWA harus bisa buat jurnal');
  assert(!can('SISWA', 'sync:run'), 'SISWA tidak boleh sync');

  // eslint-disable-next-line no-console
  console.log('[smoke] auth + rbac OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] GAGAL', e);
  process.exit(1);
});
