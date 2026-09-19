'use strict';
const multer = require('multer');
const env = require('../config/env');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new Error('Hanya JPG/PNG/WEBP yang diizinkan'));
    }
    cb(null, true);
  },
});

module.exports = { upload };
