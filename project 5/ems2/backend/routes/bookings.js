const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function seatsTakenFor(eventId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(tickets), 0) AS taken FROM bookings
       WHERE eventId = ? AND status IN ('pending', 'approved', 'booked')`
    )
    .get(eventId);
  return row.taken;
}

// ---------- POST /api/book ----------
router.post('/', (req, res) => {
  const { eventId, tickets, specialRequest } = req.body;
  const ticketCount = Number(tickets) || 1;

  if (!eventId) return res.status(400).json({ error: 'eventId is required.' });
  if (ticketCount < 1) return res.status(400).json({ error: 'tickets must be at least 1.' });

  const event = db.prepare('SELECT * FROM events WHERE id = ? AND isDeleted = 0').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  if (event.lifecycle === 'cancelled') {
    return res.status(400).json({ error: 'This event has been cancelled.' });
  }
  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    return res.status(400).json({ error: 'Registration deadline for this event has passed.' });
  }

  const existing = db
    .prepare(
      `SELECT * FROM bookings WHERE userId = ? AND eventId = ? AND status IN ('pending','approved','booked')`
    )
    .get(req.user.id, eventId);
  if (existing) {
    return res.status(409).json({ error: 'You already have an active booking for this event.' });
  }

  const taken = seatsTakenFor(eventId);
  if (taken + ticketCount > event.totalSeats) {
    return res.status(400).json({
      error: `Not enough seats available. Only ${Math.max(event.totalSeats - taken, 0)} left.`,
    });
  }

  const bookingRef = `BKG-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const totalAmount = event.price * ticketCount;

  const info = db
    .prepare(
      `INSERT INTO bookings (bookingRef, userId, eventId, tickets, totalAmount, specialRequest, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`
    )
    .run(bookingRef, req.user.id, eventId, ticketCount, totalAmount, specialRequest || '');

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ booking });
});

// ---------- GET /api/book/my-bookings ----------
router.get('/my-bookings', (req, res) => {
  const rows = db
    .prepare(
      `SELECT b.*, e.id AS event_id, e.title AS event_title, e.date AS event_date,
              e.time AS event_time, e.venue AS event_venue, e.price AS event_price,
              e.lifecycle AS event_lifecycle
       FROM bookings b
       JOIN events e ON e.id = b.eventId
       WHERE b.userId = ?
       ORDER BY b.createdAt DESC`
    )
    .all(req.user.id);

  const bookings = rows.map((b) => ({
    id: b.id,
    bookingRef: b.bookingRef,
    userId: b.userId,
    eventId: b.eventId,
    tickets: b.tickets,
    totalAmount: b.totalAmount,
    specialRequest: b.specialRequest,
    status: b.status,
    bookingDate: b.bookingDate,
    createdAt: b.createdAt,
    event: {
      id: b.event_id,
      title: b.event_title,
      date: b.event_date,
      time: b.event_time,
      venue: b.event_venue,
      price: b.event_price,
      lifecycle: b.event_lifecycle,
    },
  }));

  res.json({ bookings });
});

// ---------- DELETE /api/book/:id ----------
router.delete('/:id', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.userId !== req.user.id) {
    return res.status(403).json({ error: 'You can only cancel your own bookings.' });
  }
  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Booking is already cancelled.' });
  }

  const event = db.prepare('SELECT date FROM events WHERE id = ?').get(booking.eventId);
  if (event && new Date() > new Date(event.date)) {
    return res.status(400).json({ error: 'Cannot cancel a booking after the event has started.' });
  }

  db.prepare(`UPDATE bookings SET status = 'cancelled', updatedAt = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Booking cancelled successfully.' });
});

module.exports = router;
