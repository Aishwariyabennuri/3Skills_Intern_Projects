const express = require('express');
const db = require('../config/db');

const router = express.Router();

function parseTags(tagsStr) {
  return tagsStr ? tagsStr.split(',').filter(Boolean) : [];
}

function attachCategory(event) {
  if (!event) return event;
  const { categoryId, categoryName, ...rest } = event;
  return {
    ...rest,
    categoryId,
    tags: parseTags(event.tags),
    category: categoryId ? { id: categoryId, name: categoryName } : null,
  };
}

function seatsTakenFor(eventId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(tickets), 0) AS taken FROM bookings
       WHERE eventId = ? AND status IN ('pending', 'approved', 'booked')`
    )
    .get(eventId);
  return row.taken;
}

// ---------- GET /api/events ----------
// Query params: search, category, dateFrom, dateTo, minPrice, maxPrice, mode, sort
router.get('/', (req, res) => {
  const { search, category, dateFrom, dateTo, minPrice, maxPrice, mode, sort } = req.query;

  let query = `
    SELECT e.*, c.name AS categoryName
    FROM events e
    LEFT JOIN categories c ON c.id = e.categoryId
    WHERE e.isDeleted = 0 AND e.status = 'published'
  `;
  const params = [];

  if (category) { query += ' AND e.categoryId = ?'; params.push(category); }
  if (mode) { query += ' AND e.mode = ?'; params.push(mode); }
  if (dateFrom) { query += ' AND e.date >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND e.date <= ?'; params.push(dateTo); }
  if (minPrice) { query += ' AND e.price >= ?'; params.push(Number(minPrice)); }
  if (maxPrice) { query += ' AND e.price <= ?'; params.push(Number(maxPrice)); }
  if (search) {
    query += ' AND (e.title LIKE ? OR e.organizer LIKE ? OR e.venue LIKE ? OR e.location LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  switch (sort) {
    case 'latest': query += ' ORDER BY e.createdAt DESC'; break;
    case 'oldest': query += ' ORDER BY e.createdAt ASC'; break;
    case 'price_asc': query += ' ORDER BY e.price ASC'; break;
    case 'price_desc': query += ' ORDER BY e.price DESC'; break;
    default: query += ' ORDER BY e.date ASC'; break;
  }

  const rows = db.prepare(query).all(...params);
  const events = rows.map((e) => {
    const taken = seatsTakenFor(e.id);
    return { ...attachCategory(e), seatsAvailable: Math.max(e.totalSeats - taken, 0) };
  });

  res.json({ events });
});

// ---------- GET /api/events/:id ----------
router.get('/:id', (req, res) => {
  const event = db
    .prepare(
      `SELECT e.*, c.name AS categoryName FROM events e
       LEFT JOIN categories c ON c.id = e.categoryId
       WHERE e.id = ? AND e.isDeleted = 0`
    )
    .get(req.params.id);

  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const taken = seatsTakenFor(event.id);
  res.json({ event: { ...attachCategory(event), seatsAvailable: Math.max(event.totalSeats - taken, 0) } });
});

module.exports = router;
