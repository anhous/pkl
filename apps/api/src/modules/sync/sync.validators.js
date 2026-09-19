'use strict';
const { z } = require('zod');

const ENTITIES = ['jurusan', 'siswa', 'guru', 'dudi', 'instruktur'];

const syncRunSchema = z.object({
  sourceApp: z.string().min(1).max(60).default('MANUAL'),
  endpoint: z.string().max(255).optional().nullable(),
  payload: z.array(z.record(z.any())).optional(),
});

function buildSyncMessage(entity, count, sourceApp) {
  return `[stub] Sync ${entity} dari ${sourceApp}: ${count} record diterima, belum ada mutasi DB (integrasi EMIS/DAPODIK Fase 5)`;
}

module.exports = { ENTITIES, syncRunSchema, buildSyncMessage };
