import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

type Paso = 'correo' | 'codigo';

function mensaje(err: any, porDefecto: string): string {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
}

/**
 * Ingreso sin contraseña: la persona escribe su correo institucional, recibe
 * un código de 6 dígitos y lo escribe aquí. La primera vez se le pide además
 * el nombre, con el que se crea su cuenta.
 */
export function IngresoConCodigo({ dominios }: { dominios: string[] }) {
  const [paso, setPaso] = useState<Paso>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [pideNombre, setPideNombre] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const nav = useNavigate();

  const ejemplo = dominios[0] ? `usuario@${dominios[0]}` : 'usuario@uts.edu.co';

  const solicitar = async () => {
    setCargando(true);
    setError(null);
    try {
      await api.post('/auth/codigo/solicitar', { email });
      setPaso('codigo');
      setCodigo('');
      setAviso(`Te enviamos un código a ${email}. Si no aparece en un par de minutos, revisa la carpeta de spam.`);
    } catch (err) {
      setError(mensaje(err, 'No se pudo enviar el código.'));
    } finally {
      setCargando(false);
    }
  };

  const verificar = async () => {
    setCargando(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/codigo/verificar', {
        email,
        codigo,
        ...(pideNombre ? { nombre } : {}),
      });
      if (data.requiereNombre) {
        setPideNombre(true);
        setAviso('Es tu primer ingreso: escribe tu nombre completo para crear tu cuenta.');
        return;
      }
      setSession(data.token, data.user);
      nav('/');
    } catch (err) {
      setError(mensaje(err, 'No se pudo verificar el código.'));
    } finally {
      setCargando(false);
    }
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (paso === 'correo') solicitar();
    else verificar();
  };

  const cambiarCorreo = () => {
    setPaso('correo');
    setPideNombre(false);
    setAviso(null);
    setError(null);
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      {aviso && !error && (
        <p className="rounded border border-sky-200 bg-sky-50 p-2 text-sm text-sky-800">{aviso}</p>
      )}
      {error && (
        <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
      )}

      {paso === 'correo' ? (
        <div>
          <label className="label">Correo institucional</label>
          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ejemplo}
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
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {pideNombre && (
            <div>
              <label className="label">Nombre completo</label>
              <input
                className="input"
                required
                minLength={2}
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      <button className="btn-primary w-full" disabled={cargando}>
        {cargando
          ? paso === 'correo' ? 'Enviando código…' : 'Verificando…'
          : paso === 'correo' ? 'Enviarme un código' : 'Ingresar'}
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
    </form>
  );
}
