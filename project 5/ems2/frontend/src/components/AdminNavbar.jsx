import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/bookings', label: 'Bookings' },
  { to: '/admin/users', label: 'Users' },
];

export default function AdminNavbar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <header className="sticky top-0 z-10 bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/admin/dashboard" className="font-bold text-lg">🎫 EventHub Admin</Link>
        <nav className="flex items-center gap-5 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={location.pathname === l.to ? 'text-indigo-300 font-medium' : 'hover:text-indigo-300'}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="hover:text-indigo-300">Logout</button>
        </nav>
      </div>
    </header>
  );
}
