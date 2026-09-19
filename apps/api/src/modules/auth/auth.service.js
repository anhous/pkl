'use strict';
const { hashPassword, verifyPassword } = require('../../utils/password');
const { signAccessToken, signRefreshToken, verifyToken } = require('../../utils/jwt');

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

module.exports = { login, register, refresh };
