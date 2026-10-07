import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/auth';
import { ingresarConMicrosoft, mensajeDeError } from '@/lib/microsoft';
import { useConfigIngreso } from '@/lib/ingreso';

/**
 * Ingreso con la cuenta institucional.
 *
 * No se dibuja nada si el servidor no tiene configurado Entra ID, de modo que
 * la plataforma funciona igual en un despliegue local sin credenciales de la
 * universidad.
 */
export function BotonMicrosoft() {
  const config = useConfigIngreso()?.microsoft;
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();

  if (!config?.enabled) return null;

  const dominios = config.allowedDomains.map((d) => '@' + d).join(' o ');

  const entrar = async () => {
    setCargando(true);
    setError(null);
    try {
      const { token, user } = await ingresarConMicrosoft(config);
      setSession(token, user);
      nav('/');
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={entrar}
        disabled={cargando}
        className="flex w-full items-center justify-center gap-3 rounded-md border border-slate-300
                   bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors
                   hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
                   disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogoMicrosoft />
        {cargando ? 'Conectando con Microsoft…' : 'Ingresar con mi correo institucional'}
      </button>

      {dominios && !error && (
        <p className="text-center text-xs text-slate-500">
          Usa tu cuenta {dominios} de la universidad.
        </p>
      )}

      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
      )}

    </div>
  );
}

/** Cuadrícula de cuatro colores de la marca Microsoft. */
function LogoMicrosoft() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
