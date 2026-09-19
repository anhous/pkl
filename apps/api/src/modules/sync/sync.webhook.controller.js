'use strict';
const env = require('../../config/env');
const { verifySignature, dispatchEvent } = require('./sync.webhook');
const engine = require('./sync.engine');

// Webhook publik SDMS → diverifikasi via HMAC, BUKAN via JWT/session.
// GET /test meniru receiver referensi (cek koneksi dari SDMS tanpa auth).
async function test(_req, res) {
  res.json({
    status: 'ok',
    message: '🎉 PKL Webhook Receiver aktif!',
    tables: ['master_siswa', 'master_guru', 'master_jurusan'],
    webhook: env.sdmsWebhookSecret ? 'ready' : 'unconfigured',
  });
}

async function receive(req, res, next) {
  try {
    if (!env.sdmsWebhookSecret) return res.status(503).json({ message: 'SDMS_WEBHOOK_SECRET belum diisi' });
    const provided = req.headers['x-api-signature'];
    const raw = req.rawBody;
    const stringified = Buffer.from(JSON.stringify(req.body || {}));
    const ok = verifySignature(env.sdmsWebhookSecret, provided, raw ? [raw, stringified] : [stringified]);
    if (!ok) return res.status(401).json({ error: 'Invalid signature' });

    const event = req.body?.event || req.headers['x-sdms-event'];
    if (!event) return res.status(400).json({ error: 'event hilang' });
    const payload = req.body?.payload || {};

    // bulk.sync → tarik penuh di background, tetap balas 200 cepat.
    if (event === 'bulk.sync') {
      const { SdmsClient } = require('./sdms.client');
      const client = new SdmsClient({ baseUrl: env.sdmsBaseUrl, username: env.sdmsUsername, password: env.sdmsPassword, apiKey: env.sdmsApiKey });
      engine.pullAll(req.prisma, client)
        .then(() => prismaLog(req.prisma, 'SUKSES', 'bulk.sync selesai'))
        .catch((e) => prismaLog(req.prisma, 'GAGAL', `bulk.sync: ${e.message}`));
      return res.json({ status: 'ok', event, action: 'bulk-started' });
    }

    const r = await dispatchEvent(req.prisma, event, payload, { upserts: engine });
    await prismaLog(req.prisma, 'SUKSES', `webhook ${event}: ${r.action} ${r.detail || ''}`.trim());
    return res.json({ status: 'ok', event, action: r.action });
  } catch (e) { next(e); }
}

async function prismaLog(prisma, status, message) {
  try {
    await prisma.syncLog.create({ data: { sourceApp: 'SDMS-WEBHOOK', endpoint: '/api/webhooks/sdms', status, message: String(message).slice(0, 2000), recordCount: 1 } });
  } catch { /* log jangan menggagalkan webhook */ }
}

module.exports = { test, receive };
