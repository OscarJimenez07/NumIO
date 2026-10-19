import { KaTeXBlock } from './KaTeXBlock';
import { columnLabel, type MethodKey } from '@/lib/columnLabels';

interface Step {
  iteration: number;
  state: Record<string, any>;
  explanation?: string;
}

interface Props {
  steps: Step[];
  /** Método al que pertenecen los pasos; define la notación de cada columna. */
  method?: MethodKey;
  highlightIndex?: number;
  onRowClick?: (i: number) => void;
}

export function IterationsTable({ steps, method, highlightIndex, onRowClick }: Props) {
  if (steps.length === 0) return null;

  // Recolectar todas las claves relevantes (excluir arrays grandes)
  const cols = new Set<string>();
  for (const s of steps) {
    for (const k of Object.keys(s.state)) {
      const v = s.state[k];
      if (typeof v === 'number' || typeof v === 'string') cols.add(k);
    }
  }
  const columns = Array.from(cols).map((key) => ({ key, ...columnLabel(method, key) }));

  return (
    <div className="overflow-x-auto card">
      <table className="table-clean">
        <thead>
          <tr>
            <th>#</th>
            {columns.map((c) => (
              <th key={c.key} title={c.desc} className="whitespace-nowrap normal-case text-sm">
                <KaTeXBlock tex={c.tex} displayMode={false} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(i)}
              className={`cursor-pointer ${highlightIndex === i ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
            >
              <td className="font-medium">{s.iteration}</td>
              {columns.map((c) => {
                const v = s.state[c.key];
                return (
                  <td key={c.key} className="font-mono">
                    {typeof v === 'number' ? v.toFixed(6) : String(v ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Leyenda: qué es cada columna y de qué fórmula proviene */}
      <dl className="mt-4 border-t border-slate-200 pt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 text-sm text-slate-600">
        {columns
          .filter((c) => c.desc)
          .map((c) => (
            <div key={c.key} className="flex flex-wrap items-baseline gap-x-2">
              <dt className="font-medium text-slate-800">
                <KaTeXBlock tex={c.tex} displayMode={false} />
              </dt>
              <dd>
                {c.desc}
                {c.formula && (
                  <>
                    {': '}
                    <KaTeXBlock tex={c.formula} displayMode={false} />
                  </>
                )}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
