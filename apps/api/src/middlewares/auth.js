'use strict';
const { verifyToken } = require('../utils/jwt');

function getTokenFromReq(req) {
  if (req.cookies && req.cookies.accessToken) return req.cookies.accessToken;
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

function requireAuth(prisma) {
  return async (req, res, next) => {
    try {
      const token = getTokenFromReq(req);
      if (!token) return res.status(401).json({ message: 'Unauthorized' });
      const decoded = verifyToken(token);
      if (decoded.type === 'refresh') return res.status(401).json({ message: 'Gunakan access token' });

      const user = await prisma.user.findUnique({
        where: { id: decoded.sub },
        include: { role: true },
      });
      if (!user || !user.isActive) return res.status(401).json({ message: 'Akun nonaktif' });

      req.user = { id: user.id, email: user.email, role: user.role.name, roleId: user.roleId };
      next();
    } catch {
      return res.status(401).json({ message: 'Token tidak valid' });
    }
  };
}

module.exports = { requireAuth, getTokenFromReq };
