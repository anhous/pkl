'use strict';
// Smoke test lupa-password: validator + hashing token + alur generik tanpa DB.
// Jalankan: npm run test:password-reset --workspace=apps/api
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-karakter-xxxxxx';

const assert = require('assert');
const { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, changeEmailSchema } = require('../src/modules/auth/auth.validators');
const { hashResetToken, requestPasswordReset, resetPassword, changePassword, changeEmail } = require('../src/modules/auth/auth.service');

(async () => {
  // Validator
  assert.doesNotThrow(() => forgotPasswordSchema.parse({ email: 'guru@sekolah.id' }));
  assert.throws(() => forgotPasswordSchema.parse({ email: 'bukan-email' }));
  assert.doesNotThrow(() => resetPasswordSchema.parse({ token: 'a'.repeat(64), password: 'Baru12345!' }));
  assert.throws(() => resetPasswordSchema.parse({ token: 'pendek', password: 'Baru12345!' }));
  assert.throws(() => resetPasswordSchema.parse({ token: 'a'.repeat(64), password: 'pendek' }));

  // Hash stabil 64 hex, token beda -> hash beda
  const h1 = hashResetToken('token-satu');
  const h2 = hashResetToken('token-satu');
  const h3 = hashResetToken('token-dua');
  assert.strictEqual(h1, h2, 'hash harus deterministik');
  assert.match(h1, /^[0-9a-f]{64}$/, 'hash harus sha256 hex');
  assert.notStrictEqual(h1, h3, 'token beda harus hash beda');

  // Email tak dikenal -> tetap generik, tanpa bocor
  const calls = [];
  const prismaUnknown = {
    user: { findUnique: async () => null },
    passwordResetToken: { deleteMany: async () => { calls.push('delete'); } },
  };
  const r = await requestPasswordReset(prismaUnknown, { email: 'tak-ada@sekolah.id' });
  assert.match(r.message, /terdaftar/, 'harus generik');
  assert.strictEqual(r.emailSent, false);
  assert.deepStrictEqual(calls, [], 'tanpa user, DB token jangan disentuh');

  // Token tak dikenal -> 400
  const prismaInvalid = { passwordResetToken: { findUnique: async () => null } };
  await assert.rejects(() => resetPassword(prismaInvalid, { token: 'a'.repeat(64), password: 'Baru12345!' }), /Token tidak valid/);

  // Validator akun
  assert.doesNotThrow(() => changePasswordSchema.parse({ currentPassword: 'lama123', newPassword: 'Baru12345!' }));
  assert.throws(() => changePasswordSchema.parse({ currentPassword: 'lama123', newPassword: 'pendek' }));
  assert.doesNotThrow(() => changeEmailSchema.parse({ newEmail: 'baru@sekolah.id' }));
  assert.throws(() => changeEmailSchema.parse({ newEmail: 'bukan-email' }));

  // Ganti password: salah lama -> 400, benar -> update + token lama dibersihkan
  const { hashPassword } = require('../src/utils/password');
  const oldHash = await hashPassword('Lama12345!');
  let updatedTo = '';
  let cleaned = 0;
  const prismaPw = {
    user: { findUnique: async () => ({ id: 7, isActive: true, passwordHash: oldHash }) },
    passwordResetToken: { deleteMany: async () => { cleaned += 1; return { count: 1 }; } },
  };
  prismaPw.user.update = async ({ data }) => { updatedTo = data.passwordHash; return {}; };
  const { verifyPassword } = require('../src/utils/password');
  assert(await verifyPassword('Lama12345!', oldHash), 'setup hash rusak');
  await assert.rejects(() => changePassword(prismaPw, 7, { currentPassword: 'salah', newPassword: 'Baru12345!' }), /Password lama salah/);
  const okPw = await changePassword(prismaPw, 7, { currentPassword: 'Lama12345!', newPassword: 'Baru12345!' });
  assert.match(okPw.message, /berhasil/, 'ganti password harus sukses');
  assert(await verifyPassword('Baru12345!', updatedTo), 'hash baru harus cocok');
  assert(cleaned >= 1, 'token reset lama harus dibersihkan');

  // Ganti email: dobel -> 409, sukses -> email baru
  const prismaEm = {
    user: {
      findUnique: async ({ where }) => (where.email ? ({ id: 9 }) : ({ id: 7, isActive: true, email: 'lama@sekolah.id', role: { name: 'GURU' } })),
      update: async ({ data }) => ({ id: 7, email: data.email, role: { name: 'GURU' } }),
    },
  };
  await assert.rejects(() => changeEmail(prismaEm, 7, { newEmail: 'dipakai@sekolah.id' }), /sudah dipakai/);
  const prismaEmOk = {
    user: {
      findUnique: async ({ where }) => (where.email ? null : ({ id: 7, isActive: true, email: 'lama@sekolah.id', role: { name: 'GURU' } })),
      update: async ({ data }) => ({ id: 7, email: data.email, role: { name: 'GURU' } }),
    },
  };
  const em = await changeEmail(prismaEmOk, 7, { newEmail: 'baru@sekolah.id' });
  assert.strictEqual(em.email, 'baru@sekolah.id');

  // eslint-disable-next-line no-console
  console.log('[smoke] password-reset OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] GAGAL', e);
  process.exit(1);
});
