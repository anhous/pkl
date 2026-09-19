'use strict';
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const c = require('./sync.webhook.controller');

// Publik + HMAC. Rate limit longgar: SDMS retry 3x + bulk bisa burst.
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

function webhookRoutes(prisma) {
  void prisma;
  const r = Router();
  r.get('/test', c.test);
  r.post('/', webhookLimiter, c.receive);
  return r;
}

module.exports = { webhookRoutes };
