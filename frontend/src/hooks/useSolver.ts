import { useState } from 'react';
import { api } from '@/lib/api';

export interface SolveResponse {
  result: any;
  steps: Array<{ iteration: number; state: Record<string, any>; explanation?: string; latex?: string }>;
  plotData?: any;
  message?: string;
}

export interface ValidateResponse {
  isCorrect: boolean;
  feedback: any[];
  matchedSteps: number;
  totalSteps: number;
}

const MENSAJE_VACIOS = 'Hay campos numéricos vacíos. Complétalos antes de continuar.';

/**
 * true si algún dato numérico quedó vacío (NaN). Los pasos que escribe el
 * estudiante en la práctica no cuentan: un campo vacío ahí es parte de la
 * retroalimentación («Falta el valor…»).
 */
function hayVacios(valor: unknown, clave = ''): boolean {
  if (clave === 'userSteps') return false;
  if (typeof valor === 'number') return !Number.isFinite(valor);
  if (Array.isArray(valor)) return valor.some((v) => hayVacios(v));
  if (valor && typeof valor === 'object') return Object.entries(valor).some(([k, v]) => hayVacios(v, k));
  return false;
}

export function useSolver(endpoint: string) {
  const [data, setData] = useState<SolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solve = async (input: any) => {
    if (hayVacios(input)) {
      setError(MENSAJE_VACIOS);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`${endpoint}/solve`, input);
      setData(data);
      return data as SolveResponse;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al resolver';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, solve, setData };
}

export function useValidator(endpoint: string) {
  const [data, setData] = useState<ValidateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = async (payload: any) => {
    if (hayVacios(payload)) {
      setError(MENSAJE_VACIOS);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`${endpoint}/validate`, payload);
      setData(data);
      return data as ValidateResponse;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al validar';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, validate, setData };
}

export async function saveAttempt(payload: {
  methodSlug: string;
  input: any;
  steps: any;
  userSteps?: any;
  feedback?: any;
  isCorrect?: boolean;
}) {
  try {
    await api.post('/attempts', payload);
  } catch (err) {
    // No se interrumpe el ejercicio si el historial falla, pero se deja
    // constancia: el silencio absoluto ocultó durante tiempo que ningún
    // intento se estaba guardando.
    console.warn('No se pudo guardar el intento en el historial', err);
  }
}
