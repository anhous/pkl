'use strict';

// Mapper SDMS -> skema PKL. Pure, tanpa DB (kecuali resolveJurusanId).
// Key SDMS memakai kandidat fallback karena dokumentasi field resmi tidak dipublikasikan;
// kandidat disusun dari konvensi Laravel/SDMS (snake_case Indonesia).

function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  const lower = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

const str = (v) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);

// Normalisasi envelope list SDMS: {data:[...], meta} | {data:{data:[...], meta}} | [...] | {data:{...single}}
function normalizeList(envelope) {
  if (Array.isArray(envelope)) return { rows: envelope, meta: null };
  const d = envelope?.data;
  if (Array.isArray(d)) return { rows: d, meta: envelope?.meta || null };
  if (Array.isArray(d?.data)) return { rows: d.data, meta: d.meta || envelope?.meta || null };
  return { rows: [], meta: null };
}

function mapJurusan(raw) {
  return {
    kode: str(pick(raw, ['kode_jurusan', 'kode', 'singkatan'])) || `SDMS-${raw?.id ?? 'X'}`,
    nama: str(pick(raw, ['nama_jurusan', 'nama', 'jurusan'])) || 'Tanpa nama',
  };
}

function mapSiswa(raw) {
  return {
    nisn: str(pick(raw, ['nisn', 'NISN', 'nis'])),
    nama: str(pick(raw, ['nama_lengkap', 'nama', 'name'])) || 'Tanpa nama',
    kelas: str(pick(raw, ['kelas_nama', 'kelas', 'rombel', 'nama_kelas'])) || '-',
    kontak: str(pick(raw, ['no_hp', 'no_telp', 'telepon', 'kontak', 'hp'])) || null,
    jurusanKode: str(pick(raw, ['jurusan_kode', 'kode_jurusan'])),
    kelasNama: str(pick(raw, ['kelas_nama', 'kelas', 'rombel'])),
  };
}

function mapGuru(raw) {
  return {
    nip: str(pick(raw, ['nip', 'NIP', 'niy', 'NIY', 'nuptk'])) || `SDMS-G${raw?.id ?? 'X'}`,
    nama: str(pick(raw, ['nama_lengkap', 'nama', 'name'])) || 'Tanpa nama',
    kompetensi: str(pick(raw, ['mapel', 'mata_pelajaran', 'bidang', 'kompetensi', 'jabatan'])) || null,
    kontak: str(pick(raw, ['no_hp', 'no_telp', 'telepon', 'kontak', 'hp'])) || null,
  };
}

// Payload push jurnal PKL -> SDMS gateway (ringkas, stabil, JSON murni).
function mapJurnalPush(j) {
  return {
    external_id: j.id,
    tanggal: j.tanggal ? new Date(j.tanggal).toISOString().slice(0, 10) : null,
    jam_mulai: j.jamMulai,
    jam_selesai: j.jamSelesai,
    deskripsi: j.deskripsi,
    foto_url: j.fotoUrl || null,
    nilai: j.nilaiGuru ?? null,
    catatan_pembimbing: j.catatanGuru || null,
    status_verifikasi: j.statusVerifikasi,
    siswa: { nisn: j.penempatan?.siswa?.nisn || null, nama: j.penempatan?.siswa?.nama || null },
    dudi: { nama: j.penempatan?.dudi?.nama || null },
    updated_at: j.updatedAt ? new Date(j.updatedAt).toISOString() : null,
  };
}

module.exports = { pick, normalizeList, mapJurusan, mapSiswa, mapGuru, mapJurnalPush };
