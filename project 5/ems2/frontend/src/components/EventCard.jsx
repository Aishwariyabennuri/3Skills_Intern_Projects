import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function EventCard({ event }) {
  const date = new Date(event.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="h-36 bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl">
        {event.bannerImage ? (
          <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          '🎫'
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-indigo-50 text-primary px-2.5 py-0.5 rounded-full">
            {event.category?.name || 'General'}
          </span>
          <StatusBadge status={event.mode} />
        </div>
        <h3 className="font-semibold text-slate-800 leading-snug">{event.title}</h3>
        <p className="text-sm text-slate-500">📅 {date}{event.time ? ` · ${event.time}` : ''}</p>
        <p className="text-sm text-slate-500">📍 {event.venue || 'TBA'}</p>
        <p className="text-sm text-slate-500">
          💺 {event.seatsAvailable ?? event.availableSeats} seats left · 💰{' '}
          {event.price > 0 ? `$${event.price}` : 'Free'}
        </p>
        <Link
          to={`/events/${event.id}`}
          className="mt-auto bg-primary text-white text-center text-sm py-2 rounded-lg hover:bg-primary-dark"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
