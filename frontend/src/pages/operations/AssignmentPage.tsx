import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { StepPlayer } from '@/components/math/StepPlayer';
import { saveAttempt, useSolver } from '@/hooks/useSolver';

export function AssignmentPage() {
  const [n, setN] = useState(3);
  const [costs, setCosts] = useState<number[][]>([
    [3, 5, 11],
    [4, 8, 7],
    [9, 6, 10],
  ]);
  const [maximize, setMaximize] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const { data, loading, error, solve } = useSolver('/operations/assignment');

  const resize = (newN: number) => {
    setN(newN);
    setCosts((prev) => {
      const out: number[][] = [];
      for (let i = 0; i < newN; i++) {
        const row = [];
        for (let j = 0; j < newN; j++) row.push(prev[i]?.[j] ?? 0);
        out.push(row);
      }
      return out;
    });
  };

  const onSolve = async () => {
    const r = await solve({ costs, maximize });
    if (r) {
      setStepIdx(0);
      saveAttempt({ methodSlug: 'assignment', input: { costs, maximize }, steps: r.steps, isCorrect: true });
    }
  };

  return (
    <div>
      <PageHeader
        title="Problema de Asignación (Algoritmo Húngaro)"
        category="Investigación de Operaciones"
        description="Asignación óptima 1-a-1 de n tareas a n recursos minimizando (o maximizando) el costo total."
        reference="Taha, H. (2017). Operations Research."
      />

      <div className="card mb-6">
        <div className="flex gap-3 items-end mb-4">
          <div>
            <label className="label">Tamaño n</label>
            <input className="input w-20" type="number" min={2} max={8} value={n} onChange={(e) => resize(Number(e.target.value))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={maximize} onChange={(e) => setMaximize(e.target.checked)} />
            Maximizar
          </label>
          <button className="btn-primary ml-auto" onClick={onSolve} disabled={loading}>
            {loading ? 'Resolviendo...' : 'Resolver'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-700 mb-2">{error}</p>}

        <table className="table-clean">
          <thead>
            <tr>
              <th></th>
              {Array.from({ length: n }, (_, j) => <th key={j}>R{j + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {costs.map((row, i) => (
              <tr key={i}>
                <td className="font-medium">T{i + 1}</td>
                {row.map((v, j) => (
                  <td key={j}>
                    <input
                      className="input font-mono w-16"
                      type="number"
                      step="any"
                      value={v}
                      onChange={(e) => {
                        const next = costs.map((r) => [...r]);
                        next[i][j] = Number(e.target.value);
                        setCosts(next);
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-2">Asignación óptima</h3>
            <p><strong>Costo total: </strong><span className="font-mono">{data.result.totalCost}</span></p>
            <ul className="mt-2 text-sm">
              {(data.result.assignment as Array<{ task: number; resource: number }>).map((a, i) => (
                <li key={i}>Tarea T{a.task} → Recurso R{a.resource}</li>
              ))}
            </ul>
          </div>

          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />
          <div className="card">
            <p className="text-sm text-slate-700">{data.steps[stepIdx]?.explanation}</p>
          </div>

          <Tabs
            tabs={[
              {
                id: 'steps',
                label: 'Pasos del algoritmo',
                content: (
                  <div className="card overflow-x-auto">
                    <table className="table-clean">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.steps.map((s, i) => (
                          <tr key={i} className={stepIdx === i ? 'bg-brand-50' : ''}>
                            <td>{s.iteration}</td>
                            <td className="text-sm">{s.explanation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
