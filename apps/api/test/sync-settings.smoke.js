'use strict';
// Smoke test pengaturan SDMS: validator + overlay DB->env + masking secret (mock prisma).
// Jalankan: npm run test:sync-settings --workspace=apps/api
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-min-32-karakter-xxxxxx';

const assert = require('assert');
const { syncSettingsSchema } = require('../src/modules/sync/sync.validators');
const settings = require('../src/modules/sync/settings');

function mockPrisma(rows) {
  const store = new Map(rows.map((r) => [r.key, r.value]));
  return {
    appSetting: {
      findMany: async () => [...store.entries()].map(([key, value]) => ({ key, value })),
      upsert: async ({ where, update, create }) => {
        const v = (update && update.value !== undefined ? update.value : create.value);
        store.set(where.key, v);
        return { key: where.key, value: v };
      },
    },
    _store: store,
  };
}

(async () => {
  // Validator
  assert.doesNotThrow(() => settings && syncSettingsSchema.parse({ SDMS_BASE_URL: 'http://sdms.local', SDMS_SYNC_ENABLED: true, SDMS_PULL_CRON: '0 2 * * *' }));
  assert.throws(() => syncSettingsSchema.parse({ SDMS_PULL_CRON: 'ngawur' }));
  assert.throws(() => syncSettingsSchema.parse({ SDMS_BASE_URL: 'x'.repeat(300) }));

  // Overlay: DB menimpa env, secret hanya penanda
  const prisma = mockPrisma([
    { key: 'SDMS_BASE_URL', value: 'http://sdms-db.local' },
    { key: 'SDMS_PASSWORD', value: 'rahasia' },
  ]);
  const got = await settings.getSyncSettings(prisma);
  assert.strictEqual(got.baseUrl, 'http://sdms-db.local');
  assert.strictEqual(got.passwordSet, true);
  assert.strictEqual(got.apiKeySet, false);
  assert(!('password' in got), 'secret mentah jangan bocor');

  // Update: secret kosong = pertahankan, field lain menimpa
  const saved = await settings.updateSyncSettings(prisma, { SDMS_PASSWORD: '', SDMS_USERNAME: 'operator' });
  assert.strictEqual(saved.username, 'operator');
  assert.strictEqual(saved.passwordSet, true, 'password kosong harus dipertahankan');
  assert.strictEqual(prisma._store.get('SDMS_USERNAME'), 'operator');

  // Client dari DB
  const client = await settings.makeClientFromDb(prisma);
  assert.strictEqual(client.baseUrl, 'http://sdms-db.local');
  assert.strictEqual(client.username, 'operator');

  // Env efektif scheduler
  const eff = await settings.effectiveSyncEnv(mockPrisma([{ key: 'SDMS_SYNC_ENABLED', value: 'true' }]));
  assert.strictEqual(eff.sdmsSyncEnabled, true);

  // eslint-disable-next-line no-console
  console.log('[smoke] sync-settings OK');
})().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[smoke] GAGAL', e);
  process.exit(1);
});
