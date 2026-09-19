'use strict';
const { z } = require('zod');

const presensiCreate = z.object({
  penempatanId: z.number().int().positive(),
  tanggal: z.coerce.date(),
  statusKehadiran: z.enum(['HADIR', 'IZIN', 'SAKIT', 'ALPHA']),
  kondisiKesehatan: z.enum(['SEHAT', 'SAKIT_RINGAN', 'BUTUH_PENANGANAN']),
  catatanKesehatan: z.string().max(1000).optional().nullable(),
});
const presensiUpdate = z.object({
  tanggal: z.coerce.date().optional(),
  statusKehadiran: z.enum(['HADIR', 'IZIN', 'SAKIT', 'ALPHA']).optional(),
  kondisiKesehatan: z.enum(['SEHAT', 'SAKIT_RINGAN', 'BUTUH_PENANGANAN']).optional(),
  catatanKesehatan: z.string().max(1000).optional().nullable(),
});

module.exports = { presensiCreate, presensiUpdate };
