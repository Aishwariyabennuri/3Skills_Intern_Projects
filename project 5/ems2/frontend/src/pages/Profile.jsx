import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function Profile() {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', address: '', dob: '', gender: '' });
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    api.get('/auth/profile').then(({ data }) => {
      const u = data.user;
      setForm({
        name: u.name || '',
        phone: u.phone || '',
        address: u.address || '',
        dob: u.dob ? u.dob.split('T')[0] : '',
        gender: u.gender || '',
      });
      setEmail(u.email);
    }).catch((err) => setError(err.message));
  }, []);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', form);
      updateUser({ name: data.user.name });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (pwForm.password !== pwForm.confirmPassword) {
      return setPwError('New passwords do not match.');
    }
    try {
      await api.put('/auth/change-password', pwForm);
      setPwSuccess('Password changed successfully.');
      setPwForm({ currentPassword: '', password: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 mb-6">Update your account details.</p>

        <Alert message={error} onClose={() => setError('')} />
        <Alert message={success} type="success" onClose={() => setSuccess('')} />

        <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.name} onChange={update('name')} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (cannot be changed)</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-slate-100" value={email} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.address} onChange={update('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.dob} onChange={update('dob')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select className="w-full border border-slate-300 rounded-lg px-3 py-2" value={form.gender} onChange={update('gender')}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full bg-primary text-white py-2.5 rounded-lg hover:bg-primary-dark disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-semibold text-slate-800 mb-3">Change Password</h2>
        <Alert message={pwError} onClose={() => setPwError('')} />
        <Alert message={pwSuccess} type="success" onClose={() => setPwSuccess('')} />
        <form onSubmit={handlePasswordChange} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Current Password</label>
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={pwForm.currentPassword} onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={pwForm.password} onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2"
              value={pwForm.confirmPassword} onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))} required />
          </div>
          <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg hover:bg-slate-900">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
