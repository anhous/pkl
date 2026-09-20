'use strict';
// Smoke test lupa-password: validator + hashing token + alur generik tanpa DB.
// Jalankan: npm run test:password-reset --workspace=apps/api
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-karakter-xxxxxx';

const assert = require('assert');
const { forgotPasswordSchema, resetPasswordSchema } = require('../src/modules/auth/auth.validators');
const { hashResetToken, requestPasswordReset, resetPassword } = require('../src/modules/auth/auth.service');

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

  // eslint-disable-next-line no-console
  console.log('[smoke] password-reset OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] GAGAL', e);
  process.exit(1);
});
