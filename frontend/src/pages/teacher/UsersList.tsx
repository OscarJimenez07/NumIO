import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';
import { NOMBRE_ROL, useAuthStore, type Role } from '@/lib/auth';

interface Usuario {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  provider: 'LOCAL' | 'MICROSOFT' | 'CODIGO';
  tieneContrasena: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

function mensaje(err: any, porDefecto: string): string {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
}

function formaDeIngreso(u: Usuario): string {
  if (u.tieneContrasena) return u.mustChangePassword ? 'Contraseña temporal' : 'Contraseña';
  if (u.provider === 'MICROSOFT') return 'Microsoft';
  if (u.provider === 'CODIGO') return 'Código al correo';
  return 'Sin contraseña';
}

/**
 * Usuarios registrados. El docente o el administrador puede cambiar el rol de
 * cada cuenta y darle una contraseña temporal a quien olvidó la suya.
 */
export function UsersList() {
  const yo = useAuthStore((s) => s.user);
  const soyAdmin = yo?.role === 'ADMIN';
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<Role | ''>('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [temporal, setTemporal] = useState<{ usuario: Usuario; clave: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  // Ventana para escribir la contraseña temporal de una cuenta.
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(true);

  useEffect(() => {
    api
      .get<Usuario[]>('/users')
      .then(({ data }) => setUsuarios(data))
      .catch((err) => setError(mensaje(err, 'No se pudo cargar la lista de usuarios.')))
      .finally(() => setCargando(false));
  }, []);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter(
      (u) =>
        (!filtroRol || u.role === filtroRol) &&
        (!q || u.fullName.toLowerCase().includes(q) || u.email.includes(q)),
    );
  }, [usuarios, busqueda, filtroRol]);

  const conteo = (r: Role) => usuarios.filter((u) => u.role === r).length;

  /** Mismas reglas que el servidor, para no ofrecer lo que va a rechazar. */
  const editable = (u: Usuario) => u.id !== yo?.id && (soyAdmin || u.role !== 'ADMIN');

  const reemplazar = (u: Usuario) => setUsuarios((lista) => lista.map((x) => (x.id === u.id ? u : x)));

  const cambiarRol = async (u: Usuario, role: Role) => {
    if (role === u.role) return;
    if (!window.confirm(`¿Cambiar a ${u.fullName} de ${NOMBRE_ROL[u.role]} a ${NOMBRE_ROL[role]}?`)) return;
    setOcupado(u.id);
    setError(null);
    try {
      const { data } = await api.patch(`/users/${u.id}/rol`, { role });
      reemplazar({ ...u, role: data.role });
    } catch (err) {
      setError(mensaje(err, 'No se pudo cambiar el rol.'));
    } finally {
      setOcupado(null);
    }
  };

  const abrirRestablecer = (u: Usuario) => {
    setEditando(u);
    setClave('');
    setVerClave(true);
    setError(null);
  };

  /** Sugerencia fácil de dictar, sin letras que se confundan (l/1, o/0). */
  const generar = () => {
    const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
    const azar = new Uint32Array(8);
    crypto.getRandomValues(azar);
    const c = Array.from(azar, (n) => alfabeto[n % alfabeto.length]).join('');
    setClave(`${c.slice(0, 4)}-${c.slice(4)}`);
    setVerClave(true);
  };

  const restablecer = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = editando;
    if (!u) return;
    setOcupado(u.id);
    setError(null);
    try {
      const { data } = await api.post(`/users/${u.id}/restablecer-contrasena`, { password: clave });
      setEditando(null);
      reemplazar({ ...u, tieneContrasena: true, mustChangePassword: true });
      setCopiado(false);
      setTemporal({ usuario: u, clave: data.passwordTemporal });
    } catch (err) {
      setError(mensaje(err, 'No se pudo restablecer la contraseña.'));
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async () => {
    if (!temporal) return;
    try {
      await navigator.clipboard.writeText(temporal.clave);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuarios registrados"
        category="Panel docente"
        description="Cambia el rol de cada cuenta o dale una contraseña temporal a quien olvidó la suya."
      />

      {temporal && (
        <div className="card mb-4 border-emerald-300 bg-emerald-50">
          <p className="text-sm text-emerald-900">
            Listo. Contraseña temporal de <strong>{temporal.usuario.fullName}</strong> ({temporal.usuario.email}):
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="rounded bg-white px-3 py-1.5 font-mono text-xl font-bold tracking-wider text-slate-900">
              {temporal.clave}
            </code>
            <button type="button" className="btn-secondary" onClick={copiar}>
              {copiado ? 'Copiada' : 'Copiar'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setTemporal(null)}>
              Cerrar
            </button>
          </div>
          <p className="mt-2 text-sm text-emerald-900">
            Entrégasela a la persona. Al entrar con ella, NumIO le pedirá elegir su propia contraseña.
          </p>
        </div>
      )}

      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setEditando(null)}
        >
          <form
            onSubmit={restablecer}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md space-y-4 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-clave"
          >
            <div>
              <h2 id="titulo-clave" className="text-lg font-semibold text-slate-800">Cambiar contraseña</h2>
              <p className="text-sm text-slate-600">
                {editando.fullName} · <span className="font-mono">{editando.email}</span>
              </p>
            </div>
            {error && (
              <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
            )}
            <div>
              <label className="label" htmlFor="clave-temporal">Contraseña temporal (mín. 8 caracteres)</label>
              <div className="flex gap-2">
                <input
                  id="clave-temporal"
                  className="input font-mono"
                  type={verClave ? 'text' : 'password'}
                  minLength={8}
                  maxLength={72}
                  required
                  autoFocus
                  autoComplete="off"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                />
                <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => setVerClave((v) => !v)}>
                  {verClave ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <button type="button" className="mt-1 text-sm text-brand-800 hover:underline" onClick={generar}>
                Generar una al azar
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Su contraseña actual dejará de funcionar y se cerrarán sus sesiones abiertas. Al entrar con esta,
              NumIO le pedirá elegir su propia contraseña.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button className="btn-primary" disabled={ocupado === editando.id}>
                {ocupado === editando.id ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && !editando && (
        <p className="mb-4 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          type="search"
          placeholder="Buscar por nombre o correo"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="input w-auto"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value as Role | '')}
        >
          <option value="">Todos ({usuarios.length})</option>
          <option value="STUDENT">Estudiantes ({conteo('STUDENT')})</option>
          <option value="TEACHER">Docentes ({conteo('TEACHER')})</option>
          <option value="ADMIN">Administradores ({conteo('ADMIN')})</option>
        </select>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Contraseña</th>
                <th>Ingresa con</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((u) => {
                const puede = editable(u);
                const esperando = ocupado === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.fullName}
                      {u.id === yo?.id && <span className="ml-1 text-xs text-slate-500">(tú)</span>}
                    </td>
                    <td className="font-mono">{u.email}</td>
                    <td>
                      {puede ? (
                        <select
                          className="input w-auto py-1 text-sm"
                          value={u.role}
                          disabled={esperando}
                          onChange={(e) => cambiarRol(u, e.target.value as Role)}
                          aria-label={`Rol de ${u.fullName}`}
                        >
                          <option value="STUDENT">{NOMBRE_ROL.STUDENT}</option>
                          <option value="TEACHER">{NOMBRE_ROL.TEACHER}</option>
                          {soyAdmin && <option value="ADMIN">{NOMBRE_ROL.ADMIN}</option>}
                        </select>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{NOMBRE_ROL[u.role]}</span>
                      )}
                    </td>
                    <td>
                      {puede && (
                        <button
                          type="button"
                          className="btn-secondary whitespace-nowrap px-3 py-1 text-sm"
                          disabled={esperando}
                          onClick={() => abrirRestablecer(u)}
                        >
                          Cambiar contraseña
                        </button>
                      )}
                    </td>
                    <td className="text-sm">
                      <span className={u.mustChangePassword ? 'text-amber-700' : ''}>{formaDeIngreso(u)}</span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-slate-500">
                    Ningún usuario coincide con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
