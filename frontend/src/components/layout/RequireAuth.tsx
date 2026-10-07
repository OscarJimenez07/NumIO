import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';

// Una vez por carga de la página basta para traer el rol y el estado vigentes.
let actualizado = false;

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const location = useLocation();

  // El usuario guardado en el navegador puede estar viejo: un docente pudo
  // cambiarle el rol o restablecerle la contraseña desde la última visita.
  useEffect(() => {
    if (!token || actualizado) return;
    actualizado = true;
    api.get('/auth/me').then(({ data }) => data && setUser(data)).catch(() => {});
  }, [token, setUser]);

  if (!token) {
    actualizado = false;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user?.mustChangePassword && location.pathname !== '/cambiar-contrasena') {
    return <Navigate to="/cambiar-contrasena" replace />;
  }
  return <>{children}</>;
}
