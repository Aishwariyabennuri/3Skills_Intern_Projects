import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-primary">🎫 EventHub</Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link to="/" className="hover:text-primary">Home</Link>
          {user && !user.role?.includes('admin') && (
            <>
              <Link to="/my-bookings" className="hover:text-primary">My Bookings</Link>
              <Link to="/profile" className="hover:text-primary">Profile</Link>
            </>
          )}
          {user ? (
            <button onClick={handleLogout} className="hover:text-primary">Logout</button>
          ) : (
            <>
              <Link to="/login" className="hover:text-primary">Login</Link>
              <Link
                to="/register"
                className="bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-dark"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
