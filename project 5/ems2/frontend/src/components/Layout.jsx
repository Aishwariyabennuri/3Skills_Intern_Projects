import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import AdminNavbar from './AdminNavbar';

export default function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-slate-50">
      {isAdmin ? <AdminNavbar /> : <Navbar />}
      <Outlet />
    </div>
  );
}
