import { useEffect, useState } from 'react';
import { api } from './api';
import type { ConfigMicrosoft } from './microsoft';

/**
 * Formas de ingreso que ofrece el servidor.
 *
 * La configuración no se compila dentro del paquete: se pregunta al servidor
 * al abrir la pantalla de ingreso. Así el mismo build sirve para cualquier
 * despliegue y activar o desactivar una opción no obliga a recompilar.
 */
export interface ConfigIngreso {
  microsoft: ConfigMicrosoft;
  /** Código de un solo uso enviado al correo institucional. */
  codigo: { enabled: boolean; allowedDomains: string[] };
  /** Correo y contraseña (y registro con contraseña). */
  contrasena: boolean;
  /** «¿Olvidaste tu contraseña?»: código al correo para poner una nueva. */
  restablecerContrasena: boolean;
}

// Si la consulta falla solo se ofrece correo y contraseña, como antes de que
// existieran las otras opciones.
const POR_DEFECTO: ConfigIngreso = {
  microsoft: { enabled: false, clientId: null, tenantId: null, allowedDomains: [] },
  codigo: { enabled: false, allowedDomains: [] },
  contrasena: true,
  restablecerContrasena: false,
};

// Una sola consulta por carga de la página, la compartan cuantos componentes sea.
let pendiente: Promise<ConfigIngreso> | null = null;

export function obtenerConfigIngreso(): Promise<ConfigIngreso> {
  pendiente ??= api
    .get('/auth/config')
    .then(({ data }) => ({
      microsoft: { ...POR_DEFECTO.microsoft, ...data?.microsoft },
      codigo: { ...POR_DEFECTO.codigo, ...data?.codigo },
      contrasena: data?.contrasena ?? true,
      restablecerContrasena: data?.restablecerContrasena ?? false,
    }))
    .catch(() => POR_DEFECTO);
  return pendiente;
}

/** La configuración del servidor; null mientras llega. */
export function useConfigIngreso(): ConfigIngreso | null {
  const [config, setConfig] = useState<ConfigIngreso | null>(null);
  useEffect(() => {
    let vigente = true;
    obtenerConfigIngreso().then((c) => {
      if (vigente) setConfig(c);
    });
    return () => { vigente = false; };
  }, []);
  return config;
}
