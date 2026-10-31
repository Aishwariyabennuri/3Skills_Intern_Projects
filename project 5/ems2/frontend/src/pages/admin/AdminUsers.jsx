import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Alert from '../../components/Alert';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => api.get('/admin/users').then(({ data }) => setUsers(data.users));

  useEffect(() => { load(); }, []);

  const toggleActive = async (u) => {
    try { await api.put(`/admin/users/${u.id}`, { isActive: !u.isActive }); load(); }
    catch (err) { setError(err.message); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Delete this user? This will also remove their bookings.')) return;
    try { await api.delete(`/admin/users/${id}`); setSuccess('User deleted.'); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Manage Users</h1>
      <p className="text-slate-500 mb-6">View, deactivate, or remove registered users.</p>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      {users.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No registered users yet.</div>
      ) : (
        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.phone || '—'}</td>
                  <td className="p-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2 flex-wrap">
                    <button onClick={() => toggleActive(u)} className="text-xs border border-slate-300 px-2 py-1 rounded hover:bg-slate-50">
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button>
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
