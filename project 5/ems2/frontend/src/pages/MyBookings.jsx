import { useEffect, useState } from 'react';
import api from '../utils/api';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/book/my-bookings');
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancelBooking = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setError(''); setSuccess('');
    try {
      await api.delete(`/book/${id}`);
      setSuccess('Booking cancelled.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">My Bookings</h1>
      <p className="text-slate-500 mb-6">Track and manage your event registrations.</p>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {loading ? (
        <p className="text-center py-16 text-slate-400">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">You haven't booked any events yet.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-start flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">{b.event?.title || 'Event removed'}</h3>
                {b.event && (
                  <p className="text-sm text-slate-500">
                    📅 {new Date(b.event.date).toLocaleDateString()}{b.event.time ? ` · ${b.event.time}` : ''} · 📍 {b.event.venue || 'TBA'}
                  </p>
                )}
                <p className="text-sm text-slate-500">🎟 Ref: {b.bookingRef} · Tickets: {b.tickets} · Total: ${b.totalAmount}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={b.status} />
                {b.status !== 'cancelled' && (
                  <button
                    onClick={() => cancelBooking(b.id)}
                    className="block mt-2 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
