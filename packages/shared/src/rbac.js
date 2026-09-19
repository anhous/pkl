'use strict';

// Sumber kebenaran tunggal untuk role. Backend + frontend impor dari sini.
// Fase 2: aktifkan INSTRUKTUR.
const ROLES = Object.freeze({
  SUPERADMIN: 'SUPERADMIN',
  ADMIN_SEKOLAH: 'ADMIN_SEKOLAH',
  GURU: 'GURU',
  SISWA: 'SISWA',
  INSTRUKTUR: 'INSTRUKTUR', // nonaktif di MVP
});

const ROLE_HIERARCHY = Object.freeze({
  SUPERADMIN: 100,
  ADMIN_SEKOLAH: 80,
  GURU: 50,
  SISWA: 10,
  INSTRUKTUR: 40,
});

// Matrix aksi → role yang boleh. Dipakai middleware requireRole + guard UI.
const PERMISSIONS = Object.freeze({
  'user:create': ['SUPERADMIN', 'ADMIN_SEKOLAH'],
  'user:read': ['SUPERADMIN', 'ADMIN_SEKOLAH'],
  'master:write': ['SUPERADMIN', 'ADMIN_SEKOLAH'],
  'master:read': ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'],
  'penempatan:write': ['SUPERADMIN', 'ADMIN_SEKOLAH'],
  'penempatan:read': ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'],
  'jurnal:create': ['SISWA'],
  'jurnal:read:own': ['SISWA'],
  'jurnal:read:guided': ['GURU', 'ADMIN_SEKOLAH', 'SUPERADMIN'],
  'jurnal:nilai': ['GURU', 'ADMIN_SEKOLAH', 'SUPERADMIN'],
  'presensi:create': ['SISWA'],
  'analitik:read': ['SUPERADMIN', 'ADMIN_SEKOLAH', 'GURU'],
  'sync:run': ['SUPERADMIN', 'ADMIN_SEKOLAH'],
});

function can(role, action) {
  const allowed = PERMISSIONS[action];
  return Array.isArray(allowed) && allowed.includes(role);
}

module.exports = { ROLES, ROLE_HIERARCHY, PERMISSIONS, can };
