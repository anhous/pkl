'use strict';
const { z } = require('zod');

const ENTITIES = ['jurusan', 'siswa', 'guru', 'dudi', 'instruktur'];

const syncRunSchema = z.object({
  sourceApp: z.string().min(1).max(60).default('MANUAL'),
  endpoint: z.string().max(255).optional().nullable(),
  payload: z.array(z.record(z.any())).optional(),
});

let cronValidate = null;
try {
  // eslint-disable-next-line global-require
  cronValidate = require('node-cron').validate;
} catch {
  cronValidate = null;
}
const cronString = z.string().min(9).max(60).refine(
  (v) => (cronValidate ? cronValidate(v) : /^(\S+\s+){4}\S+$/.test(v.trim())),
  { message: 'Format cron tidak valid (contoh: 0 2 * * *)' },
);

// Semua opsional: undefined = pertahankan, '' pada secret = pertahankan,
// '' pada field lain = kembali ke bawaan .env.
const syncSettingsSchema = z.object({
  SDMS_BASE_URL: z.string().max(255).optional(),
  SDMS_USERNAME: z.string().max(120).optional(),
  SDMS_PASSWORD: z.string().max(255).optional(),
  SDMS_API_KEY: z.string().max(255).optional(),
  SDMS_WEBHOOK_SECRET: z.string().max(255).optional(),
  SDMS_SYNC_ENABLED: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  SDMS_PULL_CRON: cronString.optional(),
  SDMS_PUSH_CRON: cronString.optional(),
});

function buildSyncMessage(entity, count, sourceApp) {
  return `[stub] Sync ${entity} dari ${sourceApp}: ${count} record diterima, belum ada mutasi DB (integrasi EMIS/DAPODIK Fase 5)`;
}

module.exports = { ENTITIES, syncRunSchema, syncSettingsSchema, buildSyncMessage };
