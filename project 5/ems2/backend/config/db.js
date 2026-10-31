// Uses Node's built-in SQLite module (node:sqlite) — no external database,
// no installation, no server to run. Requires Node.js v22.5.0 or later.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, '..', 'ems.db'));
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  profileImage TEXT,
  address TEXT DEFAULT '',
  dob TEXT,
  gender TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  bannerImage TEXT,
  categoryId INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  organizer TEXT DEFAULT '',
  speaker TEXT DEFAULT '',
  date TEXT NOT NULL,
  time TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  location TEXT DEFAULT '',
  latitude REAL,
  longitude REAL,
  mode TEXT DEFAULT 'offline' CHECK(mode IN ('online','offline')),
  price REAL NOT NULL DEFAULT 0,
  totalSeats INTEGER NOT NULL,
  registrationDeadline TEXT,
  requirements TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published')),
  lifecycle TEXT NOT NULL DEFAULT 'upcoming' CHECK(lifecycle IN ('upcoming','ongoing','completed','cancelled')),
  createdBy INTEGER REFERENCES users(id),
  isDeleted INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookingRef TEXT UNIQUE NOT NULL,
  userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eventId INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tickets INTEGER NOT NULL DEFAULT 1,
  totalAmount REAL NOT NULL DEFAULT 0,
  specialRequest TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','booked','cancelled','completed')),
  bookingDate TEXT NOT NULL DEFAULT (datetime('now')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

module.exports = db;
