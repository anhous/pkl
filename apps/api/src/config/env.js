'use strict';
require('dotenv').config();

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === null || v === '') throw new Error(`ENV ${name} wajib diisi`);
  return v;
}

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test-secret-min-32-karakter-xxxxxx' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '5', 10),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'superadmin@sekolah.id',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Superadmin123!',
  // --- Integrasi SDMS SMKN 1 Kras (Tahap 5) ---
  sdmsBaseUrl: (process.env.SDMS_BASE_URL || 'http://sdms.smkn1kras.sch.id').replace(/\/+$/, ''),
  sdmsUsername: process.env.SDMS_USERNAME || '',
  sdmsPassword: process.env.SDMS_PASSWORD || '',
  sdmsApiKey: process.env.SDMS_API_KEY || '',
  sdmsWebhookSecret: process.env.SDMS_WEBHOOK_SECRET || '',
  sdmsSyncEnabled: process.env.SDMS_SYNC_ENABLED === 'true',
  sdmsPullCron: process.env.SDMS_PULL_CRON || '0 2 * * *',
  sdmsPushCron: process.env.SDMS_PUSH_CRON || '5 * * * *',
};
