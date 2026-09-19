'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const { prisma } = require('./config/db');
const { buildRoutes } = require('./routes');
const { errorHandler } = require('./middlewares/error');

function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  // Tangkap raw body untuk verifikasi HMAC webhook SDMS (X-API-Signature atas bytes mentah).
  app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); } }));
  app.use(cookieParser());
  app.use(morgan('dev'));

  // Prisma per-request (pola sederhana MVP; Fase high-concurrency bisa pakai CLS/pool tuning)
  app.use((req, _res, next) => {
    req.prisma = prisma;
    next();
  });

  // Static uploads lokal
  const uploadAbs = path.resolve(env.uploadDir);
  fs.mkdirSync(uploadAbs, { recursive: true });
  app.use('/uploads', express.static(uploadAbs, { maxAge: '7d' }));

  app.use('/api', buildRoutes(prisma));

  // 404 JSON
  app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

  // Central error handler (terakhir)
  app.use((err, _req, res, _next) => {
    if (err && err.status) return res.status(err.status).json({ message: err.message });
    return errorHandler(err, _req, res, _next);
  });

  return app;
}

module.exports = { createApp };
