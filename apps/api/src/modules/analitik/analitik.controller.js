'use strict';
const svc = require('./analitik.service');

const num = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : d;
};

async function overview(req, res, next) {
  try { res.json(await svc.getOverview(req.prisma)); } catch (e) { next(e); }
}
async function dudiMap(req, res, next) {
  try { res.json({ data: await svc.getDudiMap(req.prisma) }); } catch (e) { next(e); }
}
async function kehadiran(req, res, next) {
  try { res.json(await svc.getKehadiran(req.prisma, req.user, { from: req.query.from, to: req.query.to })); } catch (e) { next(e); }
}
async function dudiTerbaik(req, res, next) {
  try { res.json({ data: await svc.getDudiTerbaik(req.prisma, req.user, num(req.query.limit, 10)) }); } catch (e) { next(e); }
}
async function nilaiTertinggi(req, res, next) {
  try { res.json({ data: await svc.getNilaiTertinggi(req.prisma, req.user, num(req.query.limit, 10)) }); } catch (e) { next(e); }
}
async function terajin(req, res, next) {
  try { res.json({ data: await svc.getTerajin(req.prisma, req.user, num(req.query.limit, 10)) }); } catch (e) { next(e); }
}
async function bermasalah(req, res, next) {
  try { res.json({ data: await svc.getBermasalah(req.prisma, req.user, num(req.query.limit, 50)) }); } catch (e) { next(e); }
}
async function teraktif(req, res, next) {
  try { res.json({ data: await svc.getJurnalTeraktif(req.prisma, req.user, num(req.query.limit, 20)) }); } catch (e) { next(e); }
}
async function exportData(req, res, next) {
  try {
    const type = ['jurnal', 'presensi', 'penempatan'].includes(req.query.type) ? req.query.type : 'jurnal';
    const csv = await svc.exportCsv(req.prisma, req.user, { type, from: req.query.from, to: req.query.to });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-export.csv"`);
    res.send(`\uFEFF${csv}`); // BOM agar Excel baca UTF-8
  } catch (e) { next(e); }
}

module.exports = { overview, dudiMap, kehadiran, dudiTerbaik, nilaiTertinggi, terajin, bermasalah, teraktif, exportData };
