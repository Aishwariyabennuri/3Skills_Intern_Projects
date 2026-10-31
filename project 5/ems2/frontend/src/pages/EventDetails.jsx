import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import StatusBadge from '../components/StatusBadge';

export default function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState(1);
  const [specialRequest, setSpecialRequest] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvent(); /* eslint-disable-next-line */ }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setError('');
    setSuccess('');
    setBooking(true);
    try {
      await api.post('/book', { eventId: id, tickets: Number(tickets), specialRequest });
      setSuccess('Booking submitted successfully! Check "My Bookings" for status.');
      loadEvent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <p className="text-center py-16 text-slate-400">Loading event...</p>;
  if (!event) return <p className="text-center py-16 text-slate-400">Event not found.</p>;

  const date = new Date(event.date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const soldOut = event.seatsAvailable === 0;
  const canBook = !soldOut && event.lifecycle === 'upcoming';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-5xl">
          {event.bannerImage ? (
            <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
          ) : '🎫'}
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-2 flex-wrap">
            <span className="text-xs bg-indigo-50 text-primary px-2.5 py-0.5 rounded-full">
              {event.category?.name || 'General'}
            </span>
            <StatusBadge status={event.lifecycle} />
            <StatusBadge status={event.mode} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{event.title}</h1>
          <p className="text-slate-500 mb-4">{event.description || 'No description provided.'}</p>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <p><strong>📅 Date:</strong> {date}{event.time ? ` at ${event.time}` : ''}</p>
            <p><strong>⏱ Duration:</strong> {event.duration || 'N/A'}</p>
            <p><strong>📍 Venue:</strong> {event.venue || 'TBA'}</p>
            <p><strong>🌍 Location:</strong> {event.location || 'TBA'}</p>
            <p><strong>🎤 Speaker:</strong> {event.speaker || 'TBA'}</p>
            <p><strong>🏢 Organizer:</strong> {event.organizer || 'N/A'}</p>
            <p><strong>💰 Price:</strong> {event.price > 0 ? `$${event.price}` : 'Free'}</p>
            <p><strong>💺 Seats:</strong> {event.seatsAvailable} / {event.totalSeats} available</p>
          </div>

          {event.requirements && (
            <p className="text-sm text-slate-500 mb-4"><strong>Requirements:</strong> {event.requirements}</p>
          )}
          {event.tags?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {event.tags.map((t) => (
                <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">#{t}</span>
              ))}
            </div>
          )}

          <hr className="my-4 border-slate-200" />

          <form onSubmit={handleBook} className="space-y-3">
            <h2 className="font-semibold text-slate-800">Book This Event</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Number of Tickets</label>
              <input
                type="number"
                min={1}
                max={event.seatsAvailable || 1}
                value={tickets}
                onChange={(e) => setTickets(e.target.value)}
                disabled={!canBook}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Special Requests (optional)</label>
              <textarea
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                disabled={!canBook}
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
              />
            </div>
            <button
              type="submit"
              disabled={!canBook || booking}
              className="w-full bg-primary text-white py-2.5 rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {soldOut ? 'Sold Out' : booking ? 'Booking...' : 'Book Now'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
