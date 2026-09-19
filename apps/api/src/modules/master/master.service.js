'use strict';
const { prismaKnownError } = require('../../utils/pagination');

async function listJurusan(prisma, { skip, take, search, order }) {
  const where = search ? { OR: [{ kode: { contains: search } }, { nama: { contains: search } }] } : {};
  const [total, data] = await Promise.all([
    prisma.masterJurusan.count({ where }),
    prisma.masterJurusan.findMany({ where, skip, take, orderBy: { id: order } }),
  ]);
  return { total, data };
}

async function listSiswa(prisma, { skip, take, search, order, status, jurusanId }) {
  const where = {};
  if (status) where.status = status;
  if (jurusanId) where.jurusanId = jurusanId;
  if (search) where.OR = [{ nisn: { contains: search } }, { nama: { contains: search } }, { kelas: { contains: search } }];
  const [total, data] = await Promise.all([
    prisma.masterSiswa.count({ where }),
    prisma.masterSiswa.findMany({ where, skip, take, orderBy: { id: order }, include: { jurusan: true } }),
  ]);
  return { total, data };
}

async function listGuru(prisma, { skip, take, search, order }) {
  const where = search ? { OR: [{ nip: { contains: search } }, { nama: { contains: search } }] } : {};
  const [total, data] = await Promise.all([
    prisma.masterGuru.count({ where }),
    prisma.masterGuru.findMany({ where, skip, take, orderBy: { id: order } }),
  ]);
  return { total, data };
}

async function listDudi(prisma, { skip, take, search, order }) {
  const where = search ? { OR: [{ nama: { contains: search } }, { alamat: { contains: search } }] } : {};
  const [total, data] = await Promise.all([
    prisma.masterDudi.count({ where }),
    prisma.masterDudi.findMany({
      where, skip, take, orderBy: { id: order },
      include: { _count: { select: { penempatan: true } } },
    }),
  ]);
  return { total, data };
}

async function listInstruktur(prisma, { skip, take, search, order, dudiId }) {
  const where = {};
  if (dudiId) where.dudiId = dudiId;
  if (search) where.OR = [{ identifier: { contains: search } }, { nama: { contains: search } }];
  const [total, data] = await Promise.all([
    prisma.masterInstruktur.count({ where }),
    prisma.masterInstruktur.findMany({ where, skip, take, orderBy: { id: order }, include: { dudi: true } }),
  ]);
  return { total, data };
}

function wrap(fn, resource) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      throw prismaKnownError(e, { resource });
    }
  };
}

module.exports = {
  listJurusan, listSiswa, listGuru, listDudi, listInstruktur,
  createJurusan: (prisma, data) => wrap((p, d) => p.masterJurusan.create({ data: d }), 'Jurusan')(prisma, data),
  updateJurusan: (prisma, id, data) => wrap((p, i, d) => p.masterJurusan.update({ where: { id: i }, data: d }), 'Jurusan')(prisma, id, data),
  removeJurusan: (prisma, id) => wrap((p, i) => p.masterJurusan.delete({ where: { id: i } }), 'Jurusan')(prisma, id),
  createSiswa: (prisma, data) => wrap((p, d) => p.masterSiswa.create({ data: d }), 'Siswa')(prisma, data),
  updateSiswa: (prisma, id, data) => wrap((p, i, d) => p.masterSiswa.update({ where: { id: i }, data: d }), 'Siswa')(prisma, id, data),
  removeSiswa: (prisma, id) => wrap((p, i) => p.masterSiswa.delete({ where: { id: i } }), 'Siswa')(prisma, id),
  createGuru: (prisma, data) => wrap((p, d) => p.masterGuru.create({ data: d }), 'Guru')(prisma, data),
  updateGuru: (prisma, id, data) => wrap((p, i, d) => p.masterGuru.update({ where: { id: i }, data: d }), 'Guru')(prisma, id, data),
  removeGuru: (prisma, id) => wrap((p, i) => p.masterGuru.delete({ where: { id: i } }), 'Guru')(prisma, id),
  createDudi: (prisma, data) => wrap((p, d) => p.masterDudi.create({ data: d }), 'DUDI')(prisma, data),
  updateDudi: (prisma, id, data) => wrap((p, i, d) => p.masterDudi.update({ where: { id: i }, data: d }), 'DUDI')(prisma, id, data),
  removeDudi: (prisma, id) => wrap((p, i) => p.masterDudi.delete({ where: { id: i } }), 'DUDI')(prisma, id),
  createInstruktur: (prisma, data) => wrap((p, d) => p.masterInstruktur.create({ data: d }), 'Instruktur')(prisma, data),
  updateInstruktur: (prisma, id, data) => wrap((p, i, d) => p.masterInstruktur.update({ where: { id: i }, data: d }), 'Instruktur')(prisma, id, data),
  removeInstruktur: (prisma, id) => wrap((p, i) => p.masterInstruktur.delete({ where: { id: i } }), 'Instruktur')(prisma, id),
};
