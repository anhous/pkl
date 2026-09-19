'use strict';

function parsePagination(query = {}, { maxLimit = 100, defaultLimit = 20 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const order = query.order === 'desc' ? 'desc' : 'asc';
  return { page, limit, search, order, skip: (page - 1) * limit };
}

function buildMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function parseId(param) {
  const id = parseInt(param, 10);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('ID tidak valid');
    err.status = 400;
    throw err;
  }
  return id;
}

function prismaKnownError(err, { resource = 'Data' } = {}) {
  if (err && err.code === 'P2002') {
    const e = new Error(`${resource} sudah ada (duplikat unique)`);
    e.status = 409;
    return e;
  }
  if (err && err.code === 'P2025') {
    const e = new Error(`${resource} tidak ditemukan`);
    e.status = 404;
    return e;
  }
  if (err && err.code === 'P2003') {
    const e = new Error(`${resource} masih direferensikan data lain`);
    e.status = 409;
    return e;
  }
  return err;
}

module.exports = { parsePagination, buildMeta, parseId, prismaKnownError };
