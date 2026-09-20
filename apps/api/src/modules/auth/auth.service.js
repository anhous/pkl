'use strict';
const crypto = require('crypto');
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken, signRefreshToken, verifyToken } = require('../../utils/jwt');
const env = require('../../config/env');
const { sendPasswordResetEmail } = require('../../utils/mailer');

async function login(prisma, { email, password }) {
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user || !user.isActive) {
    const err = new Error('Email atau password salah');
    err.status = 401;
    throw err;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Email atau password salah');
    err.status = 401;
    throw err;
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const payload = { sub: user.id, role: user.role.name };
  return {
    user: { id: user.id, email: user.email, role: user.role.name },
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

async function register(prisma, { email, password, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email sudah terdaftar');
    err.status = 409;
    throw err;
  }
  const roleRow = await prisma.role.findUnique({ where: { name: role } });
  if (!roleRow) {
    const err = new Error('Role tidak valid');
    err.status = 400;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, roleId: roleRow.id },
    include: { role: true },
  });
  return { id: user.id, email: user.email, role: user.role.name };
}

function refresh(refreshToken) {
  const decoded = verifyToken(refreshToken);
  if (decoded.type !== 'refresh') {
    const err = new Error('Refresh token tidak valid');
    err.status = 401;
    throw err;
  }
  const payload = { sub: decoded.sub, role: decoded.role };
  return { accessToken: signAccessToken(payload) };
}

// Token reset tidak pernah disimpan mentah di DB (hanya sha256 hex 64 char).
function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function requestPasswordReset(prisma, { email }) {
  // Selalu balas generik agar email terdaftar/tidak tidak bisa di-enumerasi.
  const generic = { message: 'Jika email terdaftar & aktif, link reset sudah dikirim.' };
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { ...generic, emailSent: false };
  // Satu token aktif per user: hapus yang belum dipakai sebelum buat baru.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.resetTokenExpiresMinutes * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt } });
  const resetUrl = `${env.appUrl}/reset-password?token=${token}`;
  let emailSent = false;
  try {
    const r = await sendPasswordResetEmail({ to: user.email, resetUrl, expiresMinutes: env.resetTokenExpiresMinutes });
    emailSent = !!r.sent;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[auth] kirim email reset gagal:', e.message);
  }
  // Token mentah TIDAK dikembalikan di production (anti take-over via email enumeration).
  // Tanpa SMTP, link tercatat di log server (lihat mailer.js) untuk diambil admin via `pm2 logs`.
  return { ...generic, emailSent };
}

async function resetPassword(prisma, { token, password }) {
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    const err = new Error('Token tidak valid atau kedaluwarsa. Minta link baru.');
    err.status = 400;
    throw err;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);
  await prisma.passwordResetToken.deleteMany({ where: { userId: row.userId, usedAt: null } });
  return { message: 'Password berhasil diubah. Silakan masuk.' };
}

module.exports = { login, register, refresh, hashResetToken, requestPasswordReset, resetPassword };
