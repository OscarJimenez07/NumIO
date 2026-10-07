import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';

/** Cómo se muestra cada rol en la interfaz. */
export const NOMBRE_ROL: Record<Role, string> = {
  STUDENT: 'Estudiante',
  TEACHER: 'Docente',
  ADMIN: 'Administrador',
};

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** La contraseña es temporal (la restableció un docente): hay que cambiarla. */
  mustChangePassword?: boolean;
}

/** Dónde recuerda la barra lateral si se dejó reducida a iconos. */
export const CLAVE_PANEL = 'numio-panel';

/** Cada sesión nueva arranca con la barra lateral desplegada. */
function desplegarPanel() {
  try {
    localStorage.removeItem(CLAVE_PANEL);
  } catch {
    /* sin almacenamiento la barra ya arranca desplegada */
  }
}

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) =>
        set((s) => {
          // Solo al iniciar sesión, no al renovarla (p. ej. tras cambiar la contraseña).
          if (!s.token) desplegarPanel();
          return { token, user };
        }),
      setUser: (user) => set({ user }),
      logout: () => {
        desplegarPanel();
        set({ token: null, user: null });
      },
    }),
    { name: 'numio-auth' },
  ),
);
