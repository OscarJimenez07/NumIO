import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data.token, data.user);
      nav('/');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-white text-center mb-6">
          <h1 className="text-3xl font-bold">NumIO</h1>
          <p className="text-brand-100 text-sm">UTS · Plataforma interactiva BAN-00311</p>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Iniciar sesión</h2>
          {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>}
          <div>
            <label className="label">Correo</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@uts.edu.co"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
          <p className="text-sm text-slate-600 text-center">
            ¿No tienes cuenta?{' '}
            <Link className="text-brand-700 hover:underline" to="/register">Regístrate</Link>
          </p>
          <div className="text-xs text-slate-500 border-t border-slate-200 pt-3">
            <p className="font-semibold mb-1">Credenciales demo:</p>
            <p>admin@uts.edu.co · Admin123!</p>
            <p>docente@uts.edu.co · Docente123!</p>
            <p>estudiante@uts.edu.co · Estudiante123!</p>
          </div>
        </form>
      </div>
    </div>
  );
}
