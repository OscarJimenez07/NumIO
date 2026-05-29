interface Step {
  iteration: number;
  state: Record<string, any>;
  explanation?: string;
}

interface Props {
  steps: Step[];
  highlightIndex?: number;
  onRowClick?: (i: number) => void;
}

export function IterationsTable({ steps, highlightIndex, onRowClick }: Props) {
  if (steps.length === 0) return null;

  // Recolectar todas las claves relevantes (excluir arrays grandes)
  const cols = new Set<string>();
  for (const s of steps) {
    for (const k of Object.keys(s.state)) {
      const v = s.state[k];
      if (typeof v === 'number' || typeof v === 'string') cols.add(k);
    }
  }
  const columns = Array.from(cols);

  return (
    <div className="overflow-x-auto card">
      <table className="table-clean">
        <thead>
          <tr>
            <th>#</th>
            {columns.map((c) => (
              <th key={c} className="font-mono">{c}</th>
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
                const v = s.state[c];
                return (
                  <td key={c} className="font-mono">
                    {typeof v === 'number' ? v.toFixed(6) : String(v ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
