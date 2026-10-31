import { useEffect, useState } from 'react';
import api from '../../utils/api';

const cards = [
  { key: 'totalUsers', label: 'Total Users' },
  { key: 'totalEvents', label: 'Total Events' },
  { key: 'totalBookings', label: 'Total Bookings' },
  { key: 'upcomingEvents', label: 'Upcoming Events' },
  { key: 'todaysEvents', label: "Today's Events" },
  { key: 'revenue', label: 'Revenue', prefix: '$' },
  { key: 'cancelledBookings', label: 'Cancelled Bookings' },
  { key: 'totalSeatsAcrossEvents', label: 'Total Seats' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="text-slate-500 mb-6">Overview of your event platform.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.key} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-primary">
              {c.prefix || ''}{stats[c.key] ?? '—'}
            </div>
            <div className="text-slate-500 text-sm mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
