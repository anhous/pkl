'use strict';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err && err.isZod) return res.status(400).json({ message: 'Validasi gagal', issues: err.issues });
  if (err && /Hanya JPG\/PNG/.test(err.message)) return res.status(400).json({ message: err.message });
  if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Foto melebihi batas ukuran' });
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = { errorHandler };
