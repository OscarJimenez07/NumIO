import type { PublicClientApplication } from '@azure/msal-browser';
import { api } from './api';

/**
 * Ingreso con la cuenta institucional (Microsoft Entra ID).
 *
 * La configuración la trae lib/ingreso.ts junto con las demás formas de entrar.
 *
 * La biblioteca de Microsoft se carga solo cuando alguien pulsa el botón: son
 * unos cuantos cientos de kilobytes que no deben pesar sobre quien entra con
 * correo y contraseña.
 */

export interface ConfigMicrosoft {
  enabled: boolean;
  clientId: string | null;
  tenantId: string | null;
  allowedDomains: string[];
}

let instancia: PublicClientApplication | null = null;

async function obtenerInstancia(config: ConfigMicrosoft): Promise<PublicClientApplication> {
  if (instancia) return instancia;
  const msal = await import('@azure/msal-browser');
  instancia = new msal.PublicClientApplication({
    auth: {
      clientId: config.clientId!,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: 'sessionStorage' },
  });
  await instancia.initialize();
  return instancia;
}

/**
 * Abre la ventana de Microsoft y devuelve la sesión de NumIO.
 * El id_token no se usa en el navegador para nada más: se envía al servidor,
 * que es quien verifica la firma y decide si concede acceso.
 */
export async function ingresarConMicrosoft(config: ConfigMicrosoft) {
  const msal = await obtenerInstancia(config);
  const resultado = await msal.loginPopup({
    scopes: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  });

  if (!resultado.idToken) {
    throw new Error('Microsoft no devolvió una identidad válida.');
  }

  const { data } = await api.post('/auth/microsoft', { idToken: resultado.idToken });
  return data as { user: any; token: string };
}

/** Traduce los fallos de MSAL a algo que un estudiante pueda entender. */
export function mensajeDeError(err: any): string {
  const codigo = err?.errorCode ?? '';
  if (codigo === 'user_cancelled' || codigo === 'popup_window_error' && /closed/i.test(err?.errorMessage ?? '')) {
    return 'Cancelaste el ingreso con Microsoft.';
  }
  if (codigo === 'popup_window_error' || codigo === 'empty_window_error') {
    return 'El navegador bloqueó la ventana de Microsoft. Permite las ventanas emergentes de este sitio e inténtalo otra vez.';
  }
  const delServidor = err?.response?.data?.message;
  if (delServidor) return Array.isArray(delServidor) ? delServidor.join(', ') : String(delServidor);
  return err?.errorMessage || err?.message || 'No se pudo ingresar con la cuenta institucional.';
}
