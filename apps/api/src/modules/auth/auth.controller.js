'use strict';
const authService = require('./auth.service');
const env = require('../../config/env');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.cookieSecure,
  path: '/',
};

function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  if (refreshToken) res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 3600 * 1000 });
}

async function loginHandler(req, res, next) {
  try {
    const result = await authService.login(req.prisma, req.validated);
    setAuthCookies(res, result);
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (e) {
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function registerHandler(req, res, next) {
  try {
    // Hanya SUPERADMIN / ADMIN_SEKOLAH (dicek di route via requireRole)
    const created = await authService.register(req.prisma, req.validated);
    res.status(201).json(created);
  } catch (e) {
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function meHandler(req, res) {
  res.json({ user: req.user });
}

async function refreshHandler(req, res, next) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token hilang' });
    const { accessToken } = authService.refresh(token);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
    res.json({ accessToken });
  } catch (e) {
    next(Object.assign(e, { status: e.status || 401 }));
  }
}

async function logoutHandler(_req, res) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ message: 'Logout berhasil' });
}

async function forgotPasswordHandler(req, res, next) {
  try {
    const result = await authService.requestPasswordReset(req.prisma, req.validated);
    res.json(result);
  } catch (e) {
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function resetPasswordHandler(req, res, next) {
  try {
    const result = await authService.resetPassword(req.prisma, req.validated);
    res.json(result);
  } catch (e) {
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function changePasswordHandler(req, res, next) {
  try {
    const result = await authService.changePassword(req.prisma, req.user.id, req.validated);
    res.json(result);
  } catch (e) {
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

async function changeEmailHandler(req, res, next) {
  try {
    const result = await authService.changeEmail(req.prisma, req.user.id, req.validated);
    res.json(result);
  } catch (e) {
    next(Object.assign(e, { status: e.status || 500 }));
  }
}

module.exports = { loginHandler, registerHandler, meHandler, refreshHandler, logoutHandler, forgotPasswordHandler, resetPasswordHandler, changePasswordHandler, changeEmailHandler };

// ── SSO Callback dari SDMS ───────────────────────────────────
// ── SSO Callback dari SDMS ───────────────────────────────────
// GET /api/auth/sso-callback?token=<jwt>
async function ssoCallbackHandler(req, res, next) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token SSO tidak ditemukan' });

    const jwt = require('jsonwebtoken');
    const env = require('../../config/env');

    // Verifikasi JWT dari SDMS
    let decoded;
    try {
      decoded = jwt.verify(token, env.ssoSecret, {
        audience: 'pkl',
        issuer: 'sdms-core',
      });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token SSO sudah kadaluarsa, silakan coba lagi dari SDMS' });
      }
      return res.status(401).json({ message: 'Token SSO tidak valid' });
    }

    // Mapping role SDMS → role PKL
    const roleMap = {
      super_admin:    'SUPERADMIN',
      admin:          'ADMIN_SEKOLAH',
      guru:           'PEMBIMBING',
      wali_kelas:     'PEMBIMBING',
      kepala_sekolah: 'ADMIN_SEKOLAH',
      pegawai:        'PEMBIMBING',
      siswa:          'SISWA',
      operator:       'ADMIN_SEKOLAH',
    };
    const pklRole = roleMap[(decoded.role || '').toLowerCase()] || 'SISWA';

    const prisma = req.prisma;

    // Cari atau buat role
    let roleRow = await prisma.role.findUnique({ where: { name: pklRole } });
    if (!roleRow) roleRow = await prisma.role.create({ data: { name: pklRole } });

    // Cari user berdasarkan email dari SDMS
    const email = decoded.email || `${decoded.username}@sdms.local`;
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Buat user baru otomatis
      const crypto = require('crypto');
      const { hashPassword } = require('../../utils/password');
      const randomPass = await hashPassword(crypto.randomBytes(16).toString('hex'));
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: randomPass,
          roleId: roleRow.id,
          isActive: true,
        },
        include: { role: true },
      });
    } else {
      // Update role agar selalu sync dengan SDMS
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: roleRow.id, isActive: true },
      });
      user.role = roleRow;
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Akun tidak aktif' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const { signAccessToken, signRefreshToken } = require('../../utils/jwt');
    const payload = { sub: user.id, role: pklRole };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Redirect ke frontend dengan token di URL hash (tidak masuk server log)
    // Frontend membaca dari window.location.hash
    const frontendUrl = (env.appUrl || 'https://pkl.smkn1kras.sch.id').replace(/\/+$/, '');
    return res.redirect(`${frontendUrl}/sso/callback#at=${accessToken}&rt=${refreshToken}&role=${pklRole}`);
  } catch (e) {
    next(e);
  }
}

module.exports = { loginHandler, registerHandler, meHandler, refreshHandler, logoutHandler, forgotPasswordHandler, resetPasswordHandler, changePasswordHandler, changeEmailHandler, ssoCallbackHandler };