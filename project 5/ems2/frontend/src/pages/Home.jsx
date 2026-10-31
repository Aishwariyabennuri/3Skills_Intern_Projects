import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import EventCard from '../components/EventCard';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState('');
  const [sort, setSort] = useState('');

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (mode) params.set('mode', mode);
    if (sort) params.set('sort', sort);

    try {
      const { data } = await api.get(`/events?${params.toString()}`);
      setEvents(data.events);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, mode, sort]);

  useEffect(() => {
    const t = setTimeout(loadEvents, 300); // debounce search input
    return () => clearTimeout(t);
  }, [loadEvents]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Upcoming Events</h1>
      <p className="text-slate-500 mb-6">Search and filter events happening near you.</p>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Search by name, organizer, venue, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 flex-1 min-w-[220px] focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2"
        >
          <option value="">Online & Offline</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2"
        >
          <option value="">Sort: Soonest</option>
          <option value="latest">Latest Added</option>
          <option value="oldest">Oldest Added</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400 text-center py-16">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No events found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
