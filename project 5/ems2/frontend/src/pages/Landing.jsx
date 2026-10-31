import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold text-slate-800 mb-3">🎫 EventHub</h1>
        <p className="text-slate-500 mb-8">
          Discover, book, and manage events — all in one place.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/events" className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark">
            Browse Events
          </Link>
          <Link
            to="/login"
            className="border border-primary text-primary px-6 py-2.5 rounded-lg hover:bg-indigo-50"
          >
            User Login
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-6">
          Admin? <Link to="/admin/login" className="text-primary hover:underline">Go to Admin Panel</Link>
        </p>
      </div>
    </div>
  );
}
