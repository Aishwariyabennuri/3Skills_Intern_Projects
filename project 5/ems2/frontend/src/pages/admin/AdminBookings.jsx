import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Alert from '../../components/Alert';
import StatusBadge from '../../components/StatusBadge';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    try {
      const { data } = await api.get(`/admin/bookings?${params.toString()}`);
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [status, search]);

  const updateStatus = async (id, newStatus) => {
    setError(''); setSuccess('');
    try {
      await api.patch(`/admin/bookings/${id}/status`, { status: newStatus });
      setSuccess(`Booking ${newStatus}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const exportCSV = () => {
    const header = ['Booking Ref', 'User', 'Email', 'Event', 'Tickets', 'Amount', 'Status', 'Booked On'];
    const rows = bookings.map((b) => [
      b.bookingRef, b.user?.name, b.user?.email, b.event?.title, b.tickets, b.totalAmount, b.status,
      new Date(b.createdAt).toLocaleDateString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bookings.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">All Bookings</h1>
      <p className="text-slate-500 mb-6">Review, approve, or reject event registrations.</p>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <div className="flex gap-3 mb-6 flex-wrap">
        <input placeholder="Search by user, email, event, ref..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 flex-1 min-w-[220px]" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="booked">Booked</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
        <button onClick={exportCSV} className="border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">Export CSV</button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No bookings found.</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Event</th>
                <th className="text-left p-3">Tickets</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Booked On</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{b.user?.name}<br /><span className="text-slate-400 text-xs">{b.user?.email}</span></td>
                  <td className="p-3">{b.event?.title}</td>
                  <td className="p-3">{b.tickets}</td>
                  <td className="p-3">${b.totalAmount}</td>
                  <td className="p-3">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="p-3"><StatusBadge status={b.status} /></td>
                  <td className="p-3 flex gap-2 flex-wrap">
                    {b.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(b.id, 'approved')} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
                        <button onClick={() => updateStatus(b.id, 'rejected')} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Reject</button>
                      </>
                    )}
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
