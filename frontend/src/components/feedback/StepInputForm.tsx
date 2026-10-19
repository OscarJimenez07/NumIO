import { useState } from 'react';
import { KaTeXBlock } from '@/components/math/KaTeXBlock';

interface FieldDef {
  key: string;
  /** Encabezado en notación LaTeX (p. ej. x_{n+1}). */
  label: string;
  /** 'text' para respuestas que no son números (p. ej. la variable que entra en símplex). */
  type?: 'number' | 'text';
  placeholder?: string;
}

interface Props {
  numIterations: number;
  fields: FieldDef[];
  onSubmit: (steps: { iteration: number; state: Record<string, number | string> }[]) => void;
  loading?: boolean;
  /** Rótulo de cada fila; por defecto, su número (1, 2, …). */
  rowLabel?: (i: number) => string;
  /** Instrucción sobre qué se ingresa en cada fila. */
  description?: string;
}

export function StepInputForm({ numIterations, fields, onSubmit, loading, rowLabel, description }: Props) {
  const [values, setValues] = useState<Record<string, string>[]>(
    Array.from({ length: numIterations }, () => Object.fromEntries(fields.map((f) => [f.key, '']))),
  );

  const update = (i: number, key: string, value: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value };
      return next;
    });
  };

  const submit = () => {
    const steps = values.map((v, i) => {
      const state: Record<string, number | string> = {};
      // Un texto vacío se envía como NaN, igual que un número vacío: el backend
      // lo reporta como «Falta el valor…».
      for (const f of fields) state[f.key] = f.type === 'text' ? v[f.key].trim() || NaN : parseFloat(v[f.key]);
      return { iteration: i + 1, state };
    });
    onSubmit(steps);
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 mb-3">Practica paso a paso</h3>
      <p className="text-sm text-slate-600 mb-3">
        {description ?? 'Ingresa los valores de cada iteración.'} Al enviar, recibirás retroalimentación inmediata sobre cada paso.
      </p>
      <div className="overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th>#</th>
              {fields.map((f) => (
                <th key={f.key} className="whitespace-nowrap normal-case text-sm">
                  <KaTeXBlock tex={f.label} displayMode={false} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, i) => (
              <tr key={i}>
                <td className="font-medium whitespace-nowrap">{rowLabel ? rowLabel(i) : i + 1}</td>
                {fields.map((f) => (
                  <td key={f.key}>
                    <input
                      className="input font-mono"
                      type={f.type === 'text' ? 'text' : 'number'}
                      step={f.type === 'text' ? undefined : 'any'}
                      placeholder={f.placeholder}
                      value={row[f.key]}
                      onChange={(e) => update(i, f.key, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Validando...' : 'Validar mis pasos'}
        </button>
      </div>
    </div>
  );
}
