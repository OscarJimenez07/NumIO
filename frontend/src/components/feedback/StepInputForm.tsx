import { useState } from 'react';

interface FieldDef {
  key: string;
  label: string;
}

interface Props {
  numIterations: number;
  fields: FieldDef[];
  onSubmit: (steps: { iteration: number; state: Record<string, number> }[]) => void;
  loading?: boolean;
}

export function StepInputForm({ numIterations, fields, onSubmit, loading }: Props) {
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
      const state: Record<string, number> = {};
      for (const f of fields) state[f.key] = parseFloat(v[f.key]);
      return { iteration: i + 1, state };
    });
    onSubmit(steps);
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-slate-800 mb-3">Practica paso a paso</h3>
      <p className="text-sm text-slate-600 mb-3">
        Ingresa los valores de cada iteración. Al enviar, recibirás retroalimentación inmediata sobre cada paso.
      </p>
      <div className="overflow-x-auto">
        <table className="table-clean">
          <thead>
            <tr>
              <th>#</th>
              {fields.map((f) => (
                <th key={f.key} className="font-mono">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {values.map((row, i) => (
              <tr key={i}>
                <td className="font-medium">{i + 1}</td>
                {fields.map((f) => (
                  <td key={f.key}>
                    <input
                      className="input font-mono"
                      type="number"
                      step="any"
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
