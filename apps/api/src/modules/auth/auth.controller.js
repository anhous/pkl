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
