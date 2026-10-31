import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';

const emptyForm = {
  title: '', description: '', category: '', organizer: '', speaker: '',
  date: '', time: '', duration: '', venue: '', location: '', mode: 'offline',
  price: 0, totalSeats: 50, registrationDeadline: '', requirements: '', tags: '',
  status: 'published', lifecycle: 'upcoming',
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const [ev, cat] = await Promise.all([
      api.get('/admin/events'),
      api.get('/admin/categories'),
    ]);
    setEvents(ev.data.events);
    setCategories(cat.data.categories);
  };

  useEffect(() => { load(); }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      if (editingId) {
        await api.put(`/admin/events/${editingId}`, form);
        setSuccess('Event updated.');
      } else {
        await api.post('/admin/events', form);
        setSuccess('Event added.');
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const editEvent = (ev) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title, description: ev.description || '', category: ev.category?.id || '',
      organizer: ev.organizer || '', speaker: ev.speaker || '',
      date: ev.date ? ev.date.split('T')[0] : '', time: ev.time || '', duration: ev.duration || '',
      venue: ev.venue || '', location: ev.location || '', mode: ev.mode || 'offline',
      price: ev.price, totalSeats: ev.totalSeats,
      registrationDeadline: ev.registrationDeadline ? ev.registrationDeadline.split('T')[0] : '',
      requirements: ev.requirements || '', tags: (ev.tags || []).join(', '),
      status: ev.status, lifecycle: ev.lifecycle,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return;
    try { await api.delete(`/admin/events/${id}`); setSuccess('Event deleted.'); load(); }
    catch (err) { setError(err.message); }
  };

  const togglePublish = async (id) => {
    try { await api.patch(`/admin/events/${id}/publish`); load(); }
    catch (err) { setError(err.message); }
  };

  const duplicateEvent = async (id) => {
    try { await api.post(`/admin/events/${id}/duplicate`); setSuccess('Event duplicated as draft.'); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Manage Events</h1>
      <p className="text-slate-500 mb-6">Add, edit, publish, duplicate, or remove events.</p>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-slate-800 mb-4">{editingId ? 'Edit Event' : 'Add New Event'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.title} onChange={update('title')} required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.description} onChange={update('description')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.category} onChange={update('category')}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.mode} onChange={update('mode')}>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.date} onChange={update('date')} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input type="time" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.time} onChange={update('time')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration</label>
            <input placeholder="e.g. 2 hours" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.duration} onChange={update('duration')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Registration Deadline</label>
            <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.registrationDeadline} onChange={update('registrationDeadline')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Venue</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.venue} onChange={update('venue')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location / City</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.location} onChange={update('location')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Organizer</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.organizer} onChange={update('organizer')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Speaker</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.speaker} onChange={update('speaker')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Seats</label>
            <input type="number" min={1} className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.totalSeats} onChange={update('totalSeats')} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ($, 0 = free)</label>
            <input type="number" min={0} step="0.01" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.price} onChange={update('price')} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Requirements</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.requirements} onChange={update('requirements')} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.tags} onChange={update('tags')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.status} onChange={update('status')}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Lifecycle</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.lifecycle} onChange={update('lifecycle')}>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark">
              {editingId ? 'Update Event' : 'Add Event'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="border border-slate-300 px-5 py-2.5 rounded-lg hover:bg-slate-50">
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <h2 className="font-semibold text-slate-800 mb-3">All Events</h2>
      {events.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No events yet. Add one above.</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Seats</th>
                <th className="text-left p-3">Price</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{ev.title}</td>
                  <td className="p-3">{ev.category?.name || '—'}</td>
                  <td className="p-3">{new Date(ev.date).toLocaleDateString()}</td>
                  <td className="p-3">{ev.totalSeats}</td>
                  <td className="p-3">{ev.price > 0 ? `$${ev.price}` : 'Free'}</td>
                  <td className="p-3"><StatusBadge status={ev.status} /> <StatusBadge status={ev.lifecycle} /></td>
                  <td className="p-3 flex gap-2 flex-wrap">
                    <button onClick={() => editEvent(ev)} className="text-xs border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">Edit</button>
                    <button onClick={() => togglePublish(ev.id)} className="text-xs border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">
                      {ev.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => duplicateEvent(ev.id)} className="text-xs border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">Duplicate</button>
                    <button onClick={() => deleteEvent(ev.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
