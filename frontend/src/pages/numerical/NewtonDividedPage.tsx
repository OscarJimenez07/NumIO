import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { FunctionPlot } from '@/components/math/FunctionPlot';
import { IterationsTable } from '@/components/math/IterationsTable';
import { StepPlayer } from '@/components/math/StepPlayer';
import { PointsEditor } from '@/components/math/PointsEditor';
import { saveAttempt, useSolver } from '@/hooks/useSolver';

export function NewtonDividedPage() {
  const [points, setPoints] = useState([
    { x: 1, y: 0 },
    { x: 2, y: 0.6931 },
    { x: 3, y: 1.0986 },
    { x: 4, y: 1.3863 },
  ]);
  const [evalAt, setEvalAt] = useState(2.5);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver('/numerical/newton-divided');

  const onSolve = async () => {
    const r = await solve({ points, evalAt });
    if (r) {
      setStepIdx(0);
      saveAttempt({ methodSlug: 'newton-divided', input: { points, evalAt }, steps: r.steps, isCorrect: true });
    }
  };

  return (
    <div>
      <PageHeader
        title="Diferencias Divididas de Newton"
        category="Análisis Numérico · Interpolación"
        description="Construye el polinomio interpolante en forma de Newton mediante una tabla triangular de diferencias divididas."
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-semibold">Puntos</h3>
          <PointsEditor points={points} onChange={setPoints} />
          <div>
            <label className="label">Evaluar en x =</label>
            <input className="input" type="number" step="any" value={evalAt} onChange={(e) => setEvalAt(Number(e.target.value))} />
          </div>
          <button className="btn-primary w-full" onClick={onSolve} disabled={loading}>
            {loading ? 'Calculando...' : 'Calcular tabla y polinomio'}
          </button>
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold mb-3">Puntos</h3>
          <FunctionPlot
            xRange={[Math.min(...points.map((p) => p.x)) - 0.5, Math.max(...points.map((p) => p.x)) + 0.5]}
            marks={points.map((p) => ({ x: p.x, y: p.y, label: `(${p.x}, ${p.y})` }))}
          />
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />
          <Tabs
            tabs={[
              { id: 'steps', label: 'Pasos', content: <IterationsTable steps={data.steps} highlightIndex={stepIdx} onRowClick={setStepIdx} /> },
              {
                id: 'poly',
                label: 'Polinomio',
                content: (
                  <div className="card font-mono text-sm whitespace-pre-wrap">
                    {data.result.polynomial}
                    {data.result.evaluatedValue !== undefined && (
                      <p className="mt-3 font-sans text-slate-700">
                        <strong>P({data.result.evaluatedAt}) = {data.result.evaluatedValue}</strong>
                      </p>
                    )}
                  </div>
                ),
              },
              {
                id: 'coeffs',
                label: 'Coeficientes',
                content: (
                  <div className="card font-mono text-sm">
                    {(data.result.coefficients as number[]).map((c, i) => (
                      <p key={i}>b_{i} = {c}</p>
                    ))}
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
