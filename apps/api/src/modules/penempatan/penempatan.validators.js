'use strict';
const { z } = require('zod');

const penempatanCreate = z.object({
  siswaId: z.number().int().positive(),
  dudiId: z.number().int().positive(),
  guruId: z.number().int().positive().optional().nullable(),
  instrukturId: z.number().int().positive().optional().nullable(),
  tanggalMulai: z.coerce.date(),
  tanggalSelesai: z.coerce.date(),
  status: z.enum(['AKTIF', 'SELESAI', 'BATAL']).optional(),
});
const penempatanUpdate = penempatanCreate.partial();

module.exports = { penempatanCreate, penempatanUpdate };
