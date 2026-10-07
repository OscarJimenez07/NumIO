import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

function mensaje(err: any, porDefecto: string): string {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
}

/**
 * Cambio de la propia contraseña. Es obligatorio (la app no deja ir a otra
 * parte) cuando se entra con una contraseña temporal que dio el docente.
 */
export function CambiarContrasenaPage() {
  const obligatorio = useAuthStore((s) => s.user?.mustChangePassword ?? false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nueva !== repetida) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      // El servidor cierra las demás sesiones y devuelve una nueva para esta.
      const { data } = await api.post('/auth/contrasena/cambiar', { actual, nueva });
      setSession(data.token, data.user);
      nav('/', { replace: true });
    } catch (err) {
      setError(mensaje(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <PageHeader title="Cambiar contraseña" category="Mi cuenta" />
      <form onSubmit={enviar} className="card max-w-md space-y-4">
        {obligatorio && (
          <p className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
            Entraste con una contraseña temporal. Elige una contraseña nueva para continuar.
          </p>
        )}
        {error && (
          <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
        )}
        <div>
          <label className="label">{obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}</label>
          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contraseña nueva (mín. 8 caracteres)</label>
          <input
            className="input"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Repite la contraseña nueva</label>
          <input
            className="input"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
          />
        </div>
        <button className="btn-primary w-full" disabled={cargando}>
          {cargando ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
