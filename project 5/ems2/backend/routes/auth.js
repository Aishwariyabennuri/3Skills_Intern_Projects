const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticate, toSafeUser } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const getUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare(
  `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`
);
const updateProfileStmt = db.prepare(
  `UPDATE users SET name = ?, phone = ?, address = ?, dob = ?, gender = ?, profileImage = COALESCE(?, profileImage), updatedAt = datetime('now') WHERE id = ?`
);
const updatePasswordStmt = db.prepare(
  `UPDATE users SET password = ?, updatedAt = datetime('now') WHERE id = ?`
);

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function passwordRule() {
  return body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain a special character');
}

// ---------- POST /api/auth/register ----------
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    passwordRule(),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = getUserByEmail.get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const info = insertUser.run(name, normalizedEmail, hash, phone || null, 'user');
    const user = getUserById.get(info.lastInsertRowid);

    const token = signToken(user);
    res.status(201).json({ token, user: toSafeUser(user) });
  }
);

// ---------- POST /api/auth/login ----------
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = getUserByEmail.get(email.toLowerCase().trim());
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (!user.isActive) return res.status(403).json({ error: 'This account has been deactivated.' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid password.' });

  const token = signToken(user);
  res.json({ token, user: toSafeUser(user) });
});

// ---------- POST /api/auth/admin/login ----------
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = getUserByEmail.get(email.toLowerCase().trim());
  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid admin credentials.' });

  const token = signToken(user);
  res.json({ token, user: toSafeUser(user) });
});

// ---------- GET /api/auth/profile ----------
router.get('/profile', authenticate, (req, res) => {
  res.json({ user: toSafeUser(req.user) });
});

// ---------- PUT /api/auth/profile ----------
router.put('/profile', authenticate, upload.single('profileImage'), (req, res) => {
  const { name, phone, address, dob, gender } = req.body;
  const newImage = req.file ? `/uploads/${req.file.filename}` : null;

  updateProfileStmt.run(
    name ?? req.user.name,
    phone ?? req.user.phone,
    address ?? req.user.address,
    dob || req.user.dob,
    gender ?? req.user.gender,
    newImage,
    req.user.id
  );

  const updated = getUserById.get(req.user.id);
  res.json({ user: toSafeUser(updated) });
});

// ---------- PUT /api/auth/change-password ----------
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    passwordRule().withMessage('New password does not meet requirements'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { currentPassword, password } = req.body;
    const valid = bcrypt.compareSync(currentPassword, req.user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = bcrypt.hashSync(password, 10);
    updatePasswordStmt.run(hash, req.user.id);
    res.json({ message: 'Password changed successfully.' });
  }
);

module.exports = router;
