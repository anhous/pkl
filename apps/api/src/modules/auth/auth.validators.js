'use strict';
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(6).max(100),
});

const registerSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(8).max(100),
  role: z.enum(['ADMIN_SEKOLAH', 'GURU', 'SISWA']),
});

function zodMiddleware(schema) {
  return (req, _res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (e) {
      e.isZod = true;
      e.issues = e.issues || e.errors;
      next(e);
    }
  };
}

module.exports = { loginSchema, registerSchema, zodMiddleware };
