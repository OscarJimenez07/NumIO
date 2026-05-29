import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  return (
    <header className="bg-brand-700 text-white border-b border-brand-800">
      <div className="px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight">NumIO</span>
          <span className="text-xs bg-brand-900 px-2 py-0.5 rounded">UTS · BAN-00311</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            {user?.fullName} <span className="text-brand-200">({user?.role})</span>
          </span>
          <button
            onClick={() => {
              logout();
              nav('/login');
            }}
            className="text-sm bg-brand-800 hover:bg-brand-900 px-3 py-1 rounded"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
