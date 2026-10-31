# EventHub — Event Management System

Full-stack Event Management System:

- **Frontend**: React + Vite + Tailwind CSS, React Router, Axios
- **Backend**: Node.js + Express, **SQLite (zero install, zero server)**, JWT auth, bcrypt
- **File uploads**: Multer (local disk storage)

## Why SQLite?

No database to install, no service to start, no connection string to configure. The whole
database lives in a single file (`backend/ems.db`) that's created automatically the first
time you run the app. This uses Node's **built-in** SQLite module (`node:sqlite`) — not even
an extra npm package for the database itself.

> Requires **Node.js v22.5.0 or later** (for built-in SQLite support). Check your version with `node -v`.
> If you're on an older Node, update it from https://nodejs.org — that's the only install this project needs.

## Features

### User Module
- Registration with full validation (unique email, password complexity: 8+ chars, upper/lower/number/special char, confirm password match)
- Login with JWT
- Home page: event cards with image, category, date/time, venue, price, seats, organizer, description
- Sorting (latest, oldest, price low↔high) and filtering (category, mode, date, price)
- Instant search (by name, organizer, venue, city)
- Event details page (banner, description, speaker, organizer, schedule info, requirements, tags)
- Book event (tickets, special requests), with server-side seat-capacity checks
- My Bookings (view, cancel — blocked once the event has started)
- Profile management (edit info, change password with full validation)

### Admin Module
- Separate admin login
- Dashboard: total users/events/bookings, upcoming & today's events, revenue, cancelled bookings, total seats
- Manage Events: add / edit / delete (soft delete) / publish-unpublish / duplicate, with validation (no past dates, positive seats, non-negative price)
- Manage Categories: full CRUD
- Manage Bookings: view all, approve/reject, search, filter by status, CSV export
- Manage Users: view, activate/deactivate, delete

### Not included (clearly out of scope for this build)
These need real third-party accounts/credentials that can't be wired up generically:
- Payment gateway integration (Stripe/Razorpay/PayPal)
- QR code ticket generation & scanning, PDF ticket downloads
- Google Maps / Leaflet embeds (lat/lng fields exist in the schema, ready to plug in)
- Email/SMS/push notifications
- Real-time seat updates via WebSockets
- Multi-language support, PWA support, ratings/reviews, wishlist, coupons

## Project Structure

```
ems2/
├── backend/
│   ├── server.js
│   ├── config/db.js         # SQLite schema + connection (creates ems.db on first run)
│   ├── middleware/           # auth (JWT), upload (multer)
│   ├── routes/                # auth, events, categories, bookings, admin
│   ├── utils/seed.js          # seeds admin/categories/sample events
│   └── uploads/                # local image storage
└── frontend/
    ├── src/
    │   ├── pages/              # Landing, Login, Register, Home, EventDetails, MyBookings, Profile
    │   ├── pages/admin/        # AdminLogin, AdminDashboard, AdminEvents, AdminCategories, AdminBookings, AdminUsers
    │   ├── components/         # Navbar, AdminNavbar, EventCard, StatusBadge, Alert, Guards, Layout
    │   ├── context/AuthContext.jsx
    │   └── utils/api.js
    └── vite.config.js          # proxies /api and /uploads to the backend on :5000
```

## Setup & Run

### Prerequisites
- **Only Node.js v22.5.0+.** Nothing else to install.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed     # creates backend/ems.db + seeds admin, categories, and 6 sample events
npm start        # or: npm run dev (nodemon)
```

API runs at `http://localhost:5000`. The database file appears at `backend/ems.db` —
delete it any time to start completely fresh.

Default seeded admin (unless overridden in `.env`):
- **Email:** `admin@events.com`
- **Password:** `Admin@12345`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`. The Vite dev server proxies `/api` and `/uploads` requests
to `http://localhost:5000`, so no separate `.env` is needed for local development.

For production, run `npm run build` and serve the `dist/` folder from any static host.

## API Overview

| Area | Method & Path |
|---|---|
| Register | `POST /api/auth/register` |
| Login | `POST /api/auth/login` |
| Admin Login | `POST /api/auth/admin/login` |
| Get/Update Profile | `GET/PUT /api/auth/profile` |
| Change Password | `PUT /api/auth/change-password` |
| List/Search/Filter/Sort Events | `GET /api/events?search=&category=&mode=&dateFrom=&dateTo=&minPrice=&maxPrice=&sort=` |
| Event Details | `GET /api/events/:id` |
| Categories (public) | `GET /api/categories` |
| Book Event | `POST /api/book` (auth) |
| My Bookings | `GET /api/book/my-bookings` (auth) |
| Cancel Booking | `DELETE /api/book/:id` (auth) |
| Admin Dashboard | `GET /api/admin/dashboard` (admin) |
| Admin Events CRUD | `GET/POST/PUT/DELETE /api/admin/events[...]`, `PATCH .../publish`, `POST .../duplicate` (admin) |
| Admin Categories CRUD | `GET/POST/PUT/DELETE /api/admin/categories[...]` (admin) |
| Admin Bookings | `GET /api/admin/bookings`, `PATCH /api/admin/bookings/:id/status` (admin) |
| Admin Users | `GET /api/admin/users`, `PUT/DELETE /api/admin/users/:id` (admin) |

## Testing notes

This version was **fully tested end-to-end against a real running instance** — registration
with password-strength validation, login, admin login, event creation, booking with
seat-capacity checks, admin approval, dashboard stats, admin bookings list, and booking
cancellation were all verified working. Frontend was built and dev-server-tested with
`vite build` / `vite dev`.
