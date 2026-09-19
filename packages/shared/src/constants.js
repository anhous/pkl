'use strict';

const VERIFIKASI = Object.freeze({
  MENUNGGU: 'MENUNGGU',
  DIPERIKSA: 'DIPERIKSA',
  DISETUJUI: 'DISETUJUI',
  REVISI: 'REVISI',
});

const KEHADIRAN = Object.freeze({
  HADIR: 'HADIR',
  IZIN: 'IZIN',
  SAKIT: 'SAKIT',
  ALPHA: 'ALPHA',
});

const PENEMPATAN_STATUS = Object.freeze({
  AKTIF: 'AKTIF',
  SELESAI: 'SELESAI',
  BATAL: 'BATAL',
});

module.exports = { VERIFIKASI, KEHADIRAN, PENEMPATAN_STATUS };
