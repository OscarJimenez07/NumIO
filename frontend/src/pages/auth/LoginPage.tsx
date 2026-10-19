import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import logoUts from '@/assets/logo-uts.png';
import { BotonMicrosoft } from '@/components/auth/BotonMicrosoft';
import { IngresoConCodigo } from '@/components/auth/IngresoConCodigo';
import { useConfigIngreso } from '@/lib/ingreso';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();
  // Mientras llega la configuración no se dibuja ninguna opción, para que no
  // asome un formulario que el servidor tiene desactivado.
  const config = useConfigIngreso();

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
            <p className="text-xs text-slate-600 sm:text-sm">UTS · Plataforma interactiva BAN-00311</p>
          </div>
        </div>
        <div className="card space-y-4 shadow-md">
          <h2 className="text-xl font-semibold text-slate-800">Iniciar sesión</h2>
          {config && (
            <>
              <BotonMicrosoft />
              {config.microsoft.enabled && (config.codigo.enabled || config.contrasena) && <Separador />}
              {config.codigo.enabled && <IngresoConCodigo dominios={config.codigo.allowedDomains} />}
              {config.codigo.enabled && config.contrasena && <Separador />}
              {config.contrasena && (
                <form onSubmit={submit} className="space-y-4">
                  {error && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>}
                  <div>
                    <label className="label" htmlFor="ingreso-usuario">Correo o usuario</label>
                    {/* Basta el usuario (lo que va antes de la @); el servidor completa el resto. */}
                    <input
                      id="ingreso-usuario"
                      className="input"
                      type="text"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario o usuario@uts.edu.co"
                    />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <label className="label">Contraseña</label>
                      {config.restablecerContrasena && (
                        <Link
                          className="text-sm text-brand-800 hover:underline"
                          to={`/recuperar-contrasena${email ? `?correo=${encodeURIComponent(email)}` : ''}`}
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      )}
                    </div>
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
                    <Link className="text-brand-800 font-medium hover:underline" to="/register">Regístrate</Link>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Separador() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-xs uppercase tracking-wide text-slate-500">o</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
