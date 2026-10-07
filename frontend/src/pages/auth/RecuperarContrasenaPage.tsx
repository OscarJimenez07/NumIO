import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import logoUts from '@/assets/logo-uts.png';
import { useConfigIngreso } from '@/lib/ingreso';

type Paso = 'correo' | 'codigo';

function mensaje(err: any, porDefecto: string): string {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
}

/**
 * «¿Olvidaste tu contraseña?»: la persona escribe su correo, recibe un código
 * de 6 dígitos, lo pega aquí junto con la contraseña nueva y queda adentro.
 */
export function RecuperarContrasenaPage() {
  const [params] = useSearchParams();
  const [paso, setPaso] = useState<Paso>('correo');
  const [email, setEmail] = useState(params.get('correo') ?? '');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [repetida, setRepetida] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();
  const config = useConfigIngreso();

  const solicitar = async () => {
    setCargando(true);
    setError(null);
    try {
      await api.post('/auth/contrasena/solicitar', { email });
      setPaso('codigo');
      setCodigo('');
      setAviso(`Te enviamos un código a ${email}. Si no aparece en un par de minutos, revisa la carpeta de spam.`);
    } catch (err) {
      setError(mensaje(err, 'No se pudo enviar el código.'));
    } finally {
      setCargando(false);
    }
  };

  const restablecer = async () => {
    if (password !== repetida) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/contrasena/restablecer', { email, codigo, password });
      setSession(data.token, data.user);
      nav('/');
    } catch (err) {
      setError(mensaje(err, 'No se pudo cambiar la contraseña.'));
    } finally {
      setCargando(false);
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (paso === 'correo') solicitar();
    else restablecer();
  };

  const cambiarCorreo = () => {
    setPaso('correo');
    setAviso(null);
    setError(null);
  };

  if (config && !config.restablecerContrasena) return <Navigate to="/login" replace />;

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
            <p className="text-xs text-slate-600 sm:text-sm">Recuperar el acceso</p>
          </div>
        </div>
        <form onSubmit={enviar} className="card space-y-4 shadow-md">
          <h2 className="text-xl font-semibold text-slate-800">Restablecer contraseña</h2>
          {paso === 'correo' && !error && (
            <p className="text-sm text-slate-600">
              Escribe el correo con el que te registraste y te enviaremos un código de 6 dígitos.
            </p>
          )}
          {aviso && !error && (
            <p className="rounded border border-sky-200 bg-sky-50 p-2 text-sm text-sky-800">{aviso}</p>
          )}
          {error && (
            <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
          )}

          {paso === 'correo' ? (
            <div>
              <label className="label">Correo</label>
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@uts.edu.co"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="label">Código de 6 dígitos</label>
                <input
                  className="input text-center text-lg tracking-[0.4em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </>
          )}

          <button className="btn-primary w-full" disabled={cargando}>
            {cargando
              ? paso === 'correo' ? 'Enviando código…' : 'Guardando…'
              : paso === 'correo' ? 'Enviarme un código' : 'Cambiar contraseña e ingresar'}
          </button>

          {paso === 'codigo' && (
            <div className="flex justify-between text-sm">
              <button type="button" className="text-brand-800 hover:underline" onClick={cambiarCorreo}>
                Cambiar correo
              </button>
              <button type="button" className="text-brand-800 hover:underline" onClick={solicitar} disabled={cargando}>
                Reenviar código
              </button>
            </div>
          )}

          <p className="text-sm text-slate-600 text-center">
            ¿La recordaste?{' '}
            <Link className="text-brand-800 font-medium hover:underline" to="/login">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
