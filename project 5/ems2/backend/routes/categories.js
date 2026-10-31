const express = require('express');
const db = require('../config/db');

const router = express.Router();

// ---------- GET /api/categories ----------
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json({ categories });
});

module.exports = router;
