'use strict';
const { z } = require('zod');

const jurusanCreate = z.object({
  kode: z.string().min(1).max(20),
  nama: z.string().min(1).max(120),
});
const jurusanUpdate = jurusanCreate.partial();

const siswaCreate = z.object({
  nisn: z.string().min(1).max(20),
  nama: z.string().min(1).max(120),
  kelas: z.string().min(1).max(40),
  kontak: z.string().max(40).optional().nullable(),
  status: z.enum(['AKTIF', 'SELESAI', 'KELUAR']).optional(),
  jurusanId: z.number().int().positive().optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
});
const siswaUpdate = siswaCreate.partial();

const guruCreate = z.object({
  nip: z.string().min(1).max(30),
  nama: z.string().min(1).max(120),
  kompetensi: z.string().max(120).optional().nullable(),
  kontak: z.string().max(40).optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
});
const guruUpdate = guruCreate.partial();

const dudiCreate = z.object({
  nama: z.string().min(1).max(160),
  alamat: z.string().min(1),
  kuota: z.number().int().min(0).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  kontak: z.string().max(80).optional().nullable(),
  deskripsi: z.string().optional().nullable(),
});
const dudiUpdate = dudiCreate.partial();

const instrukturCreate = z.object({
  identifier: z.string().min(1).max(30),
  nama: z.string().min(1).max(120),
  kontak: z.string().max(40).optional().nullable(),
  dudiId: z.number().int().positive().optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
});
const instrukturUpdate = instrukturCreate.partial();

module.exports = {
  jurusanCreate, jurusanUpdate,
  siswaCreate, siswaUpdate,
  guruCreate, guruUpdate,
  dudiCreate, dudiUpdate,
  instrukturCreate, instrukturUpdate,
};
