import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import logoUts from '@/assets/logo-uts.png';
import { BotonMicrosoft } from '@/components/auth/BotonMicrosoft';
import { useConfigIngreso } from '@/lib/ingreso';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();
  const config = useConfigIngreso();

  const dominios = config?.microsoft.allowedDomains ?? [];
  // El usuario es la parte del correo antes de la @: ojavierjimenez@uts.edu.co
  // -> ojavierjimenez. El servidor usa la misma regla para el nombre.
  const usuario = email.trim().toLowerCase().split('@')[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // Mismas reglas que el servidor, para avisar sin esperar la respuesta.
    const dominio = email.trim().toLowerCase().split('@')[1] ?? '';
    if (dominios.length && !dominios.some((d) => dominio === d || dominio.endsWith('.' + d))) {
      setError(`Usa tu correo institucional (${dominios.map((d) => '@' + d).join(' o ')}).`);
      return;
    }
    if (password !== repetida) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { email, password });
      setSession(data.token, data.user);
      nav('/');
    } catch (err: any) {
      const m = err.response?.data?.message;
      setError((Array.isArray(m) ? m[0] : m) ?? 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  // Sin contraseñas no hay registro aparte: la cuenta se crea al primer
  // ingreso con Microsoft o con código.
  if (config && !config.contrasena) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Logo a la izquierda del nombre, separados por un filete */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <img
            src={logoUts}
            alt="Unidades Tecnológicas de Santander"
            className="h-14 w-auto shrink-0 sm:h-16"
            width={640}
            height={384}
          />
          <span className="h-12 w-px shrink-0 bg-slate-300" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">NumIO</h1>
            <p className="text-xs text-slate-600 sm:text-sm">Crear cuenta de estudiante</p>
          </div>
        </div>
        <form onSubmit={submit} className="card space-y-4 shadow-md">
          <h2 className="text-xl font-semibold text-slate-800">Registro</h2>
          <BotonMicrosoft />
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>}
          <div>
            <label className="label">Correo institucional</label>
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              placeholder={`usuario@${dominios[0] ?? 'uts.edu.co'}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {usuario.length >= 2 && (
              <p className="mt-1 text-sm text-slate-600">
                Tu usuario: <span className="font-semibold text-slate-800">{usuario}</span>
              </p>
            )}
          </div>
          <div>
            <label className="label">Contraseña (mín. 8 caracteres)</label>
            <input className="input" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Repite la contraseña</label>
            <input className="input" type="password" minLength={8} required autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
          <p className="text-sm text-slate-600 text-center">
            ¿Ya tienes cuenta?{' '}
            <Link className="text-brand-800 font-medium hover:underline" to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
