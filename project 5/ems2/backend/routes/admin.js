const express = require('express');
const db = require('../config/db');
const { authenticate, requireAdmin, toSafeUser } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
router.use(authenticate, requireAdmin);

function parseTags(tagsStr) {
  return tagsStr ? tagsStr.split(',').filter(Boolean) : [];
}
function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean).join(',');
  return String(tags || '').split(',').map((t) => t.trim()).filter(Boolean).join(',');
}
function attachCategory(event) {
  if (!event) return event;
  const { categoryName, ...rest } = event;
  return {
    ...rest,
    tags: parseTags(event.tags),
    category: event.categoryId ? { id: event.categoryId, name: categoryName } : null,
  };
}
function getEventWithCategory(id) {
  return db
    .prepare(
      `SELECT e.*, c.name AS categoryName FROM events e
       LEFT JOIN categories c ON c.id = e.categoryId
       WHERE e.id = ?`
    )
    .get(id);
}

/* ============ DASHBOARD ============ */
// ---------- GET /api/admin/dashboard ----------
router.get('/dashboard', (req, res) => {
  const totalUsers = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE role = 'user'`).get().c;
  const totalEvents = db.prepare('SELECT COUNT(*) AS c FROM events WHERE isDeleted = 0').get().c;
  const totalBookings = db.prepare('SELECT COUNT(*) AS c FROM bookings').get().c;
  const upcomingEvents = db
    .prepare(`SELECT COUNT(*) AS c FROM events WHERE isDeleted = 0 AND lifecycle = 'upcoming'`)
    .get().c;
  const todaysEvents = db
    .prepare(`SELECT COUNT(*) AS c FROM events WHERE isDeleted = 0 AND date = date('now')`)
    .get().c;
  const cancelledBookings = db
    .prepare(`SELECT COUNT(*) AS c FROM bookings WHERE status = 'cancelled'`)
    .get().c;
  const revenue = db
    .prepare(
      `SELECT COALESCE(SUM(totalAmount), 0) AS total FROM bookings WHERE status IN ('approved','booked','completed')`
    )
    .get().total;
  const totalSeatsAcrossEvents = db
    .prepare('SELECT COALESCE(SUM(totalSeats), 0) AS total FROM events WHERE isDeleted = 0')
    .get().total;

  res.json({
    totalUsers, totalEvents, totalBookings, upcomingEvents, todaysEvents,
    cancelledBookings, revenue, totalSeatsAcrossEvents,
  });
});

/* ============ EVENTS ============ */
// ---------- GET /api/admin/events ----------
router.get('/events', (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.*, c.name AS categoryName FROM events e
       LEFT JOIN categories c ON c.id = e.categoryId
       WHERE e.isDeleted = 0 ORDER BY e.createdAt DESC`
    )
    .all();
  res.json({ events: rows.map(attachCategory) });
});

// ---------- POST /api/admin/events ----------
router.post('/events', upload.single('bannerImage'), (req, res) => {
  const body = req.body;

  if (!body.title || !body.date || !body.totalSeats) {
    return res.status(400).json({ error: 'title, date, and totalSeats are required.' });
  }
  if (new Date(body.date) < new Date(new Date().toDateString())) {
    return res.status(400).json({ error: 'Event date cannot be in the past.' });
  }
  if (Number(body.totalSeats) <= 0) {
    return res.status(400).json({ error: 'Seats must be greater than zero.' });
  }
  if (Number(body.price) < 0) {
    return res.status(400).json({ error: 'Price cannot be negative.' });
  }

  const bannerImage = req.file ? `/uploads/${req.file.filename}` : body.bannerImage || null;

  const info = db
    .prepare(
      `INSERT INTO events
       (title, description, bannerImage, categoryId, organizer, speaker, date, time, duration,
        venue, location, latitude, longitude, mode, price, totalSeats, registrationDeadline,
        requirements, tags, status, lifecycle, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.title, body.description || '', bannerImage, body.category || null,
      body.organizer || '', body.speaker || '', body.date, body.time || '', body.duration || '',
      body.venue || '', body.location || '', body.latitude || null, body.longitude || null,
      body.mode || 'offline', Number(body.price) || 0, Number(body.totalSeats),
      body.registrationDeadline || null, body.requirements || '', normalizeTags(body.tags),
      body.status || 'published', body.lifecycle || 'upcoming', req.user.id
    );

  const event = getEventWithCategory(info.lastInsertRowid);
  res.status(201).json({ event: attachCategory(event) });
});

// ---------- PUT /api/admin/events/:id ----------
router.put('/events/:id', upload.single('bannerImage'), (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ? AND isDeleted = 0').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found.' });

  const body = req.body;
  const fields = {
    title: body.title, description: body.description, organizer: body.organizer,
    speaker: body.speaker, date: body.date, time: body.time, duration: body.duration,
    venue: body.venue, location: body.location, latitude: body.latitude, longitude: body.longitude,
    mode: body.mode, price: body.price, totalSeats: body.totalSeats,
    registrationDeadline: body.registrationDeadline, requirements: body.requirements,
    status: body.status, lifecycle: body.lifecycle,
  };
  if (body.category !== undefined) fields.categoryId = body.category || null;
  if (body.tags !== undefined) fields.tags = normalizeTags(body.tags);
  if (req.file) fields.bannerImage = `/uploads/${req.file.filename}`;

  const setClauses = [];
  const params = [];
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      setClauses.push(`${key} = ?`);
      params.push(value);
    }
  });

  if (setClauses.length > 0) {
    setClauses.push(`updatedAt = datetime('now')`);
    params.push(req.params.id);
    db.prepare(`UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = getEventWithCategory(req.params.id);
  res.json({ event: attachCategory(updated) });
});

// ---------- PATCH /api/admin/events/:id/publish ----------
router.patch('/events/:id/publish', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ? AND isDeleted = 0').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found.' });

  const newStatus = event.status === 'published' ? 'draft' : 'published';
  db.prepare(`UPDATE events SET status = ?, updatedAt = datetime('now') WHERE id = ?`).run(newStatus, req.params.id);
  const updated = getEventWithCategory(req.params.id);
  res.json({ event: attachCategory(updated) });
});

// ---------- POST /api/admin/events/:id/duplicate ----------
router.post('/events/:id/duplicate', (req, res) => {
  const source = db.prepare('SELECT * FROM events WHERE id = ? AND isDeleted = 0').get(req.params.id);
  if (!source) return res.status(404).json({ error: 'Event not found.' });

  const info = db
    .prepare(
      `INSERT INTO events
       (title, description, bannerImage, categoryId, organizer, speaker, date, time, duration,
        venue, location, latitude, longitude, mode, price, totalSeats, registrationDeadline,
        requirements, tags, status, lifecycle, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
    )
    .run(
      `${source.title} (Copy)`, source.description, source.bannerImage, source.categoryId,
      source.organizer, source.speaker, source.date, source.time, source.duration,
      source.venue, source.location, source.latitude, source.longitude, source.mode,
      source.price, source.totalSeats, source.registrationDeadline, source.requirements,
      source.tags, source.lifecycle, req.user.id
    );

  const duplicate = getEventWithCategory(info.lastInsertRowid);
  res.status(201).json({ event: attachCategory(duplicate) });
});

// ---------- DELETE /api/admin/events/:id (soft delete) ----------
router.delete('/events/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM events WHERE id = ? AND isDeleted = 0').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Event not found.' });

  db.prepare(`UPDATE events SET isDeleted = 1, updatedAt = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Event deleted successfully.' });
});

/* ============ CATEGORIES ============ */
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  res.json({ categories });
});

router.post('/categories', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });

  const existing = db.prepare('SELECT * FROM categories WHERE name = ?').get(name);
  if (existing) return res.status(409).json({ error: 'A category with this name already exists.' });

  const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || '');
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ category });
});

router.put('/categories/:id', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found.' });

  db.prepare('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?').run(
    req.body.name || null,
    req.body.description !== undefined ? req.body.description : null,
    req.params.id
  );
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json({ category: updated });
});

router.delete('/categories/:id', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found.' });

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Category deleted successfully.' });
});

/* ============ BOOKINGS ============ */
// ---------- GET /api/admin/bookings ----------
router.get('/bookings', (req, res) => {
  const { status, eventId, search } = req.query;

  let query = `
    SELECT b.*, u.name AS userName, u.email AS userEmail, u.phone AS userPhone,
           e.title AS eventTitle, e.date AS eventDate
    FROM bookings b
    JOIN users u ON u.id = b.userId
    JOIN events e ON e.id = b.eventId
    WHERE 1 = 1
  `;
  const params = [];
  if (status) { query += ' AND b.status = ?'; params.push(status); }
  if (eventId) { query += ' AND b.eventId = ?'; params.push(eventId); }
  query += ' ORDER BY b.createdAt DESC';

  let rows = db.prepare(query).all(...params);

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (b) =>
        b.userName?.toLowerCase().includes(s) ||
        b.userEmail?.toLowerCase().includes(s) ||
        b.eventTitle?.toLowerCase().includes(s) ||
        b.bookingRef?.toLowerCase().includes(s)
    );
  }

  const bookings = rows.map((b) => ({
    id: b.id, bookingRef: b.bookingRef, tickets: b.tickets, totalAmount: b.totalAmount,
    status: b.status, createdAt: b.createdAt,
    user: { id: b.userId, name: b.userName, email: b.userEmail, phone: b.userPhone },
    event: { id: b.eventId, title: b.eventTitle, date: b.eventDate },
  }));

  res.json({ bookings });
});

// ---------- PATCH /api/admin/bookings/:id/status ----------
router.patch('/bookings/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'approved', 'rejected', 'booked', 'cancelled', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  db.prepare(`UPDATE bookings SET status = ?, updatedAt = datetime('now') WHERE id = ?`).run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({ booking: updated });
});

/* ============ USERS ============ */
// ---------- GET /api/admin/users ----------
router.get('/users', (req, res) => {
  const users = db.prepare(`SELECT * FROM users WHERE role = 'user' ORDER BY createdAt DESC`).all();
  res.json({ users: users.map(toSafeUser) });
});

// ---------- PUT /api/admin/users/:id ----------
router.put('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { name, phone, isActive } = req.body;
  db.prepare(
    `UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone),
     isActive = COALESCE(?, isActive), updatedAt = datetime('now') WHERE id = ?`
  ).run(name || null, phone !== undefined ? phone : null, isActive !== undefined ? (isActive ? 1 : 0) : null, req.params.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json({ user: toSafeUser(updated) });
});

// ---------- DELETE /api/admin/users/:id ----------
router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted successfully.' });
});

module.exports = router;
