'use strict';
const { z } = require('zod');

const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;

const jurnalCreate = z.object({
  penempatanId: z.coerce.number().int().positive(),
  tanggal: z.coerce.date(),
  jamMulai: z.string().regex(JAM, 'Format jam HH:MM'),
  jamSelesai: z.string().regex(JAM, 'Format jam HH:MM'),
  deskripsi: z.string().min(10).max(5000),
  fotoLat: z.coerce.number().min(-90).max(90).optional().nullable(),
  fotoLng: z.coerce.number().min(-180).max(180).optional().nullable(),
});
const jurnalUpdate = z.object({
  tanggal: z.coerce.date().optional(),
  jamMulai: z.string().regex(JAM).optional(),
  jamSelesai: z.string().regex(JAM).optional(),
  deskripsi: z.string().min(10).max(5000).optional(),
  fotoLat: z.coerce.number().min(-90).max(90).optional().nullable(),
  fotoLng: z.coerce.number().min(-180).max(180).optional().nullable(),
});

const nilaiSchema = z.object({
  nilaiGuru: z.number().int().min(1).max(100),
  catatanGuru: z.string().max(2000).optional().nullable(),
  statusVerifikasi: z.enum(['MENUNGGU', 'DIPERIKSA', 'DISETUJUI', 'REVISI']).optional(),
});

function fotoExt(mimetype) {
  if (mimetype === 'image/png') return 'jpg'; // normalisasi ke jpeg hasil Sharp
  if (mimetype === 'image/webp') return 'jpg';
  return 'jpg';
}

module.exports = { jurnalCreate, jurnalUpdate, nilaiSchema, fotoExt };
