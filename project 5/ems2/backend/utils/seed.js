require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

function dateInDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ---------- Admin ----------
const adminEmail = (process.env.ADMIN_EMAIL || 'admin@events.com').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

let admin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
if (!admin) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  const info = db
    .prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`)
    .run('Super Admin', adminEmail, hash);
  admin = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  console.log(`Seeded admin -> ${adminEmail} / ${adminPassword}`);
} else {
  console.log('Admin already exists, skipping.');
}

// ---------- Categories ----------
const categoryDefs = [
  ['Technical', 'Tech talks, hackathons, and workshops'],
  ['Workshop', 'Hands-on skill-building sessions'],
  ['Music', 'Concerts and live performances'],
  ['Sports', 'Tournaments and sporting events'],
  ['Business', 'Networking, conferences, and seminars'],
  ['Cultural', 'Cultural festivals and celebrations'],
  ['Webinar', 'Online-only informational sessions'],
];

const categoryIds = {};
for (const [name, description] of categoryDefs) {
  let cat = db.prepare('SELECT * FROM categories WHERE name = ?').get(name);
  if (!cat) {
    const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description);
    cat = { id: info.lastInsertRowid, name };
  }
  categoryIds[name] = cat.id;
}
console.log(`Ensured ${categoryDefs.length} categories exist.`);

// ---------- Sample Events ----------
const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events WHERE isDeleted = 0').get().c;
if (eventCount === 0) {
  const sampleEvents = [
    {
      title: 'Tech Innovators Summit 2026',
      description: 'A full-day conference featuring keynotes on AI, cloud computing, and the future of software development.',
      category: 'Technical', daysFromNow: 14, time: '09:00', duration: '8 hours',
      venue: 'Hitex Exhibition Centre', location: 'Hyderabad, India', mode: 'offline',
      totalSeats: 200, price: 49, organizer: 'TechHub Events', speaker: 'Dr. Anjali Rao',
      tags: 'AI,Cloud,Software',
    },
    {
      title: 'City Hackathon: Build for Good',
      description: '24-hour hackathon where teams build solutions for local civic and social challenges. Prizes for top 3 teams.',
      category: 'Technical', daysFromNow: 21, time: '10:00', duration: '24 hours',
      venue: 'T-Hub', location: 'Hyderabad, India', mode: 'offline',
      totalSeats: 120, price: 0, organizer: 'T-Hub Foundation', tags: 'Hackathon,Civic Tech',
    },
    {
      title: 'Sunset Acoustic Night',
      description: 'An evening of live acoustic performances from indie artists, food trucks, and open-air seating.',
      category: 'Music', daysFromNow: 10, time: '18:30', duration: '3 hours',
      venue: 'Shilparamam Amphitheatre', location: 'Hyderabad, India', mode: 'offline',
      totalSeats: 300, price: 15, organizer: 'Indie Sounds Collective', tags: 'Live Music,Acoustic',
    },
    {
      title: 'Startup Founders Networking Mixer',
      description: 'Meet local founders, investors, and mentors over drinks and lightning pitches.',
      category: 'Business', daysFromNow: 7, time: '17:00', duration: '2.5 hours',
      venue: 'WeWork Banjara Hills', location: 'Hyderabad, India', mode: 'offline',
      totalSeats: 80, price: 10, organizer: 'Founders Circle', tags: 'Networking,Startups',
    },
    {
      title: 'City Marathon 2026',
      description: 'Annual 10K/21K run through the city, open to all skill levels, with medals for finishers.',
      category: 'Sports', daysFromNow: 30, time: '06:00', duration: '4 hours',
      venue: 'Necklace Road', location: 'Hyderabad, India', mode: 'offline',
      totalSeats: 500, price: 20, organizer: 'City Sports Council', tags: 'Marathon,Running',
    },
    {
      title: 'Cloud Architecture Webinar',
      description: 'A live online session covering modern cloud architecture patterns and cost optimization.',
      category: 'Webinar', daysFromNow: 5, time: '19:00', duration: '1.5 hours',
      venue: 'Online', location: 'Online', mode: 'online',
      totalSeats: 1000, price: 0, organizer: 'CloudSkills Academy', tags: 'Cloud,Architecture',
    },
  ];

  const insertEvent = db.prepare(
    `INSERT INTO events
     (title, description, categoryId, organizer, speaker, date, time, duration, venue, location,
      mode, price, totalSeats, tags, status, lifecycle, createdBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'upcoming', ?)`
  );

  for (const ev of sampleEvents) {
    insertEvent.run(
      ev.title, ev.description, categoryIds[ev.category] || null, ev.organizer, ev.speaker || '',
      dateInDays(ev.daysFromNow), ev.time, ev.duration, ev.venue, ev.location,
      ev.mode, ev.price, ev.totalSeats, ev.tags, admin.id
    );
  }
  console.log(`Seeded ${sampleEvents.length} sample events.`);
} else {
  console.log('Events already exist, skipping sample event seeding.');
}

console.log('Seed complete. Database file: backend/ems.db');
