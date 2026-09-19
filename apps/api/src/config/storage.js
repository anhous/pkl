'use strict';
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const crypto = require('crypto');
const env = require('./env');

// Interface: save(buffer, opts) -> { url, path }. Upgrade Cloudinary tanpa ubah controller.
class LocalStorageAdapter {
  constructor(uploadDir = env.uploadDir) {
    this.uploadDir = path.resolve(uploadDir);
  }

  async save(buffer, { folder = 'jurnal', ext = 'jpg' } = {}) {
    const now = new Date();
    const dir = path.join(
      this.uploadDir,
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0')
    );
    fs.mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const abs = path.join(dir, name);

    // Kompresi otomatis: max 1280px, JPEG q70 — hemat storage & upload HP.
    await sharp(buffer).rotate().resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 70 }).toFile(abs);

    const rel = path.relative(path.resolve('./'), abs).replace(/\\/g, '/');
    return { url: `/${rel}`, path: abs };
  }

  async removeByUrl(url) {
    if (!url || typeof url !== 'string') return;
    // Hanya hapus file lokal di dalam uploadDir (cegah path traversal)
    const abs = path.resolve('.' + url);
    if (!abs.startsWith(this.uploadDir)) return;
    try { await fs.promises.unlink(abs); } catch { /* best-effort */ }
  }
}

// Stub Fase 2: aktifkan jika CLOUDINARY_* diisi. Controller tetap panggil storage.save().
class CloudinaryAdapter {
  async save() {
    throw new Error('Cloudinary belum dikonfigurasi. Isi CLOUDINARY_* di .env (Fase 2).');
  }
}

function getStorage() {
  if (process.env.CLOUDINARY_CLOUD_NAME) return new CloudinaryAdapter();
  return new LocalStorageAdapter();
}

module.exports = { LocalStorageAdapter, CloudinaryAdapter, getStorage };
