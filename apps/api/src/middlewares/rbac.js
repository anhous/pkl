'use strict';

// RBAC: requireRole('ADMIN_SEKOLAH','GURU') — tolak 403 jika role tidak cocok.
// INSTRUKTUR ditolak di MVP (Fase 2).
function requireRole(...allowed) {
  const set = new Set(allowed);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role === 'INSTRUKTUR') return res.status(403).json({ message: 'Role Instruktur aktif di Fase 2' });
    if (!set.has(req.user.role)) return res.status(403).json({ message: 'Forbidden: role tidak diizinkan' });
    next();
  };
}

module.exports = { requireRole };
