'use strict';

// Pengaturan SDMS tersimpan di DB (tabel app_settings) agar bisa diubah dari
// halaman Sync oleh SUPERADMIN tanpa SSH. Nilai .env dipakai sebagai
// bawaan/fallback bila kunci belum ada di DB.
const env = require('../../config/env');
const { SdmsClient } = require('./sdms.client');

const SDMS_KEYS = [
  'SDMS_BASE_URL',
  'SDMS_USERNAME',
  'SDMS_PASSWORD',
  'SDMS_API_KEY',
  'SDMS_WEBHOOK_SECRET',
  'SDMS_SYNC_ENABLED',
  'SDMS_PULL_CRON',
  'SDMS_PUSH_CRON',
];

// Secret tidak pernah dikembalikan isinya (hanya penanda sudah-diisi).
const SECRET_KEYS = new Set(['SDMS_PASSWORD', 'SDMS_API_KEY', 'SDMS_WEBHOOK_SECRET']);

function envDefaults() {
  return {
    SDMS_BASE_URL: env.sdmsBaseUrl,
    SDMS_USERNAME: env.sdmsUsername,
    SDMS_PASSWORD: env.sdmsPassword,
    SDMS_API_KEY: env.sdmsApiKey,
    SDMS_WEBHOOK_SECRET: env.sdmsWebhookSecret,
    SDMS_SYNC_ENABLED: env.sdmsSyncEnabled ? 'true' : 'false',
    SDMS_PULL_CRON: env.sdmsPullCron,
    SDMS_PUSH_CRON: env.sdmsPushCron,
  };
}

async function readDbMap(prisma) {
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: SDMS_KEYS } } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    // Tabel belum termigrasi (server lama) -> anggap kosong, pakai .env.
    return {};
  }
}

function merged(dbMap) {
  const d = envDefaults();
  const out = {};
  for (const k of SDMS_KEYS) out[k] = dbMap[k] !== undefined ? dbMap[k] : d[k];
  return out;
}

function toClientConfig(map) {
  return {
    baseUrl: (map.SDMS_BASE_URL || '').replace(/\/+$/, ''),
    username: map.SDMS_USERNAME || '',
    password: map.SDMS_PASSWORD || '',
    apiKey: map.SDMS_API_KEY || '',
  };
}

// Tampilan aman untuk UI: secret hanya sebagai penanda.
async function getSyncSettings(prisma) {
  const map = merged(await readDbMap(prisma));
  return {
    baseUrl: map.SDMS_BASE_URL || '',
    username: map.SDMS_USERNAME || '',
    passwordSet: Boolean(map.SDMS_PASSWORD),
    apiKeySet: Boolean(map.SDMS_API_KEY),
    webhookSecretSet: Boolean(map.SDMS_WEBHOOK_SECRET),
    syncEnabled: String(map.SDMS_SYNC_ENABLED).toLowerCase() === 'true',
    pullCron: map.SDMS_PULL_CRON || '',
    pushCron: map.SDMS_PUSH_CRON || '',
    source: 'db+env',
  };
}

// Input tervalidasi (syncSettingsSchema). Aturan:
// - secret kosong/undefined = pertahankan yang lama (anti hapus tak sengaja)
// - field lain undefined = pertahankan; string (termasuk '') = timpa ('' = kembali ke bawaan .env)
async function updateSyncSettings(prisma, input) {
  const current = await readDbMap(prisma);
  const next = {};
  for (const k of SDMS_KEYS) {
    const v = input[k];
    if (v === undefined) continue;
    if (SECRET_KEYS.has(k) && v === '') continue;
    next[k] = String(v);
  }
  for (const [k, v] of Object.entries(next)) {
    await prisma.appSetting.upsert({ where: { key: k }, update: { value: v }, create: { key: k, value: v } });
  }
  return getSyncSettings(prisma);
}

// Env efektif untuk scheduler (DB menimpa .env).
async function effectiveSyncEnv(prisma) {
  const map = merged(await readDbMap(prisma));
  return {
    sdmsSyncEnabled: String(map.SDMS_SYNC_ENABLED).toLowerCase() === 'true',
    sdmsPullCron: map.SDMS_PULL_CRON || env.sdmsPullCron,
    sdmsPushCron: map.SDMS_PUSH_CRON || env.sdmsPushCron,
  };
}

async function makeClientFromDb(prisma) {
  const map = merged(await readDbMap(prisma));
  return new SdmsClient(toClientConfig(map));
}

module.exports = { SDMS_KEYS, getSyncSettings, updateSyncSettings, effectiveSyncEnv, makeClientFromDb };
