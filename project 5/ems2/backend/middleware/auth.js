const jwt = require('jsonwebtoken');
const db = require('../config/db');

const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');

function toSafeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return { ...safe, isActive: !!safe.isActive };
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token provided. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = getUserById.get(payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated.' });
    }
    req.user = user; // raw row (includes password hash) — use toSafeUser() before sending to client
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, toSafeUser };
