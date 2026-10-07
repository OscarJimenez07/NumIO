import { Link, useNavigate } from 'react-router-dom';
import { NOMBRE_ROL, useAuthStore } from '@/lib/auth';
import { Icon } from './Icons';

interface Props {
  onToggleNav: () => void;
  navOpen: boolean;
}

export function Navbar({ onToggleNav, navOpen }: Props) {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();

  return (
    // Gris claro: el lima queda como color de la barra lateral, y así la
    // franja superior no compite con ella. La identidad vive en la lateral;
    // aquí solo se repone en pantallas pequeñas, donde esa barra está oculta.
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 text-slate-900 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleNav}
          aria-label={navOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={navOpen}
          className="-ml-1 rounded-md p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-900
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 md:hidden"
        >
          <Icon name={navOpen ? 'close' : 'menu'} className="h-5 w-5" />
        </button>

        <Link
          to="/"
          className="truncate rounded text-lg font-bold tracking-tight focus:outline-none
                     focus-visible:ring-2 focus-visible:ring-brand-600 md:hidden"
        >
          NumIO
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <span className="hidden text-sm sm:inline">
          {user?.fullName} <span className="text-slate-600">({user ? NOMBRE_ROL[user.role] ?? user.role : ''})</span>
        </span>
        <Link
          to="/cambiar-contrasena"
          className="hidden text-sm text-brand-800 hover:underline lg:inline"
        >
          Cambiar contraseña
        </Link>
        <button
          onClick={() => {
            logout();
            nav('/login');
          }}
          // Mismo estilo que el botón «Resolver automáticamente» de los métodos.
          className="btn-primary px-2.5 sm:px-4"
        >
          <Icon name="logout" className="h-4 w-4" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </button>
      </div>
    </header>
  );
}
