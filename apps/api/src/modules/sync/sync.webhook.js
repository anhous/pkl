'use strict';
const crypto = require('crypto');

// Verifikasi + dispatch webhook SDMS (kontrak: docs/INTEGRATION.md di server SDMS).
// - Signature: HMAC-SHA256 hex, header X-API-Signature, dihitung atas RAW body.
//   Contoh Node di doc memakai JSON.stringify(req.body) sedangkan contoh PHP/Python
//   memakai raw content — receiver mencoba raw dulu, lalu stringify sebagai fallback.
// - Event: header X-SDMS-Event atau body.event.
// - Sukses proses SELALU 200 {status:'ok'} agar SDMS tidak retry.

function computeHex(secret, buf) {
  return crypto.createHmac('sha256', secret).update(buf).digest('hex');
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Pure — diunit-test. buffers: [rawBuf, ...fallbacks]
function verifySignature(secret, provided, buffers) {
  if (!secret || !provided) return false;
  return (buffers || []).some((buf) => buf && safeEqual(computeHex(secret, buf), provided));
}

function pickStr(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

// Dispatch 1 event. Return ringkasan {handled, action, detail}.
async function dispatchEvent(prisma, event, payload = {}, { upserts } = {}) {
  const p = payload || {};
  switch (event) {
    case 'siswa.created':
    case 'siswa.updated': {
      const nisn = pickStr(p, ['nisn', 'NISN', 'nis']);
      if (!nisn) return { handled: true, action: 'skipped', detail: 'tanpa NISN' };
      const nama = pickStr(p, ['nama_lengkap', 'nama', 'name']) || 'Tanpa nama';
      const kelas = pickStr(p, ['kelas_nama', 'nama_kelas', 'kelas', 'rombel']) || '-';
      const kontak = pickStr(p, ['no_telepon', 'no_hp', 'telepon', 'kontak', 'hp']) || null;
      const found = await prisma.masterSiswa.findUnique({ where: { nisn } });
      if (found) {
        await prisma.masterSiswa.update({ where: { id: found.id }, data: { nama, kelas, ...(kontak ? { kontak } : {}) } });
        return { handled: true, action: 'updated', detail: nisn };
      }
      await prisma.masterSiswa.create({ data: { nisn, nama, kelas, kontak } });
      return { handled: true, action: 'created', detail: nisn };
    }
    case 'siswa.deleted': {
      const nisn = pickStr(p, ['nisn', 'NISN', 'nis']);
      if (!nisn) return { handled: true, action: 'skipped', detail: 'tanpa NISN' };
      const found = await prisma.masterSiswa.findUnique({ where: { nisn } });
      if (!found) return { handled: true, action: 'skipped', detail: `nisn ${nisn} tidak ada` };
      await prisma.masterSiswa.update({ where: { id: found.id }, data: { status: 'KELUAR' } });
      return { handled: true, action: 'deactivated', detail: nisn };
    }
    case 'guru.created':
    case 'guru.updated': {
      const nip = pickStr(p, ['nip', 'NIP', 'niy', 'NIY', 'nuptk']) || `SDMS-G${p.id ?? 'X'}`;
      const nama = pickStr(p, ['nama_lengkap', 'nama', 'name']) || 'Tanpa nama';
      const kompetensi = pickStr(p, ['mata_pelajaran', 'mapel', 'bidang', 'kompetensi', 'jabatan']) || null;
      const kontak = pickStr(p, ['no_telepon', 'no_hp', 'telepon', 'kontak', 'hp']) || null;
      const found = await prisma.masterGuru.findUnique({ where: { nip } });
      if (found) {
        await prisma.masterGuru.update({ where: { id: found.id }, data: { nama, kompetensi, kontak } });
        return { handled: true, action: 'updated', detail: nip };
      }
      await prisma.masterGuru.create({ data: { nip, nama, kompetensi, kontak } });
      return { handled: true, action: 'created', detail: nip };
    }
    case 'guru.deleted':
      // MasterGuru tidak punya kolom status & dirujuk penempatan → catat, jangan hapus.
      return { handled: true, action: 'skipped', detail: `guru.deleted butuh aksi manual (${pickStr(p, ['nip', 'nama']) || '?'})` };
    case 'jurusan.created':
    case 'jurusan.updated': {
      if (!upserts) return { handled: true, action: 'skipped', detail: 'upserter tidak tersedia' };
      const kode = pickStr(p, ['kode_jurusan', 'kode', 'singkatan']);
      const nama = pickStr(p, ['nama_jurusan', 'nama']);
      if (!kode || !nama) return { handled: true, action: 'skipped', detail: 'kode/nama jurusan tak lengkap' };
      const action = await upserts.upsertJurusan(prisma, { kode, nama });
      return { handled: true, action, detail: kode };
    }
    case 'bulk.sync':
      return { handled: true, action: 'bulk', detail: 'pemicu pullAll' };
    default:
      // kelas.*, mapel.*, pegawai.*: tidak ada tabel lokal → 200 + skip (hindari retry SDMS).
      return { handled: false, action: 'skipped', detail: `event ${event} tanpa handler` };
  }
}

module.exports = { computeHex, verifySignature, pickStr, dispatchEvent };
