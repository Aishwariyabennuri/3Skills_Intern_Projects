import { useEffect, useState } from 'react';
import api from '../../utils/api';
import Alert from '../../components/Alert';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => api.get('/admin/categories').then(({ data }) => setCategories(data.categories));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.post('/admin/categories', { name, description });
      setSuccess('Category added.');
      setName(''); setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteCategory = async (id) => {
    if (!confirm('Delete this category?')) return;
    try { await api.delete(`/admin/categories/${id}`); setSuccess('Category deleted.'); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-800">Manage Categories</h1>
      <p className="text-slate-500 mb-6">Organize events into categories.</p>

      <Alert message={error} onClose={() => setError('')} />
      <Alert message={success} type="success" onClose={() => setSuccess('')} />

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 flex gap-3 flex-wrap mb-8">
        <input placeholder="Category name" className="border border-slate-300 rounded-lg px-3 py-2 flex-1 min-w-[160px]" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Description" className="border border-slate-300 rounded-lg px-3 py-2 flex-1 min-w-[200px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark">Add Category</button>
      </form>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No categories yet.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Description</th><th className="text-left p-3">Actions</th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.description || '—'}</td>
                  <td className="p-3">
                    <button onClick={() => deleteCategory(c.id)} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">Delete</button>
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
