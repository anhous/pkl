'use strict';
const { Router } = require('express');
const { requireAuth } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/rbac');
const { authLimiter } = require('../../middlewares/rateLimit');
const { loginSchema, registerSchema, zodMiddleware } = require('./auth.validators');
const c = require('./auth.controller');

function authRoutes(prisma) {
  const r = Router();
  const auth = requireAuth(prisma);

  r.post('/login', authLimiter, zodMiddleware(loginSchema), c.loginHandler);
  r.post('/refresh', c.refreshHandler);
  r.post('/logout', c.logoutHandler);
  // Pembuatan akun hanya oleh admin (anti spam + RBAC verwaltung)
  r.post('/register', auth, requireRole('SUPERADMIN', 'ADMIN_SEKOLAH'), zodMiddleware(registerSchema), c.registerHandler);
  r.get('/me', auth, c.meHandler);
  return r;
}

module.exports = { authRoutes };
