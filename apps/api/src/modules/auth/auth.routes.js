'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { authLimiter } = require('../../middlewares/rateLimit');
const { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, changeEmailSchema, zodMiddleware } = require('./auth.validators');
const c = require('./auth.controller');

function authRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);

  r.post('/login', authLimiter, zodMiddleware(loginSchema), c.loginHandler);
  r.post('/forgot-password', authLimiter, zodMiddleware(forgotPasswordSchema), c.forgotPasswordHandler);
  r.post('/reset-password', authLimiter, zodMiddleware(resetPasswordSchema), c.resetPasswordHandler);
  r.post('/refresh', c.refreshHandler);
  r.post('/logout', c.logoutHandler);
  // Pembuatan akun hanya oleh admin (anti spam + RBAC verwaltung)
  r.post('/register', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH'), zodMiddleware(registerSchema), c.registerHandler);
  r.get('/me', auth, c.meHandler);
  // Pengaturan akun sendiri (harus login)
  r.patch('/password', auth, authLimiter, zodMiddleware(changePasswordSchema), c.changePasswordHandler);
  r.patch('/email', auth, zodMiddleware(changeEmailSchema), c.changeEmailHandler);
  return r;
}

module.exports = { authRoutes };
