import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { FunctionPlot } from '@/components/math/FunctionPlot';
import { IterationsTable } from '@/components/math/IterationsTable';
import { StepPlayer } from '@/components/math/StepPlayer';
import { KaTeXBlock } from '@/components/math/KaTeXBlock';
import { MathText } from '@/components/math/MathText';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { StepInputForm } from '@/components/feedback/StepInputForm';
import { saveAttempt, useSolver, useValidator } from '@/hooks/useSolver';
import { PointsEditor } from '@/components/math/PointsEditor';
import { NumberInput } from '@/components/math/NumberInput';

export function LagrangePage() {
  const [points, setPoints] = useState([
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 5 },
  ]);
  const [evalAt, setEvalAt] = useState(1.5);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver('/numerical/lagrange');
  const validator = useValidator('/numerical/lagrange');

  const onSolve = async () => {
    const r = await solve({ points, evalAt });
    if (r) {
      setStepIdx(0);
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ points, evalAt, userSteps });
    if (r) {
      saveAttempt({ methodSlug: 'lagrange', input: { points, evalAt }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
    }
  };

  return (
    <div>
      <PageHeader
        title="Interpolación de Lagrange"
        category="Análisis Numérico · Interpolación"
        description="Construye un polinomio interpolante de grado n−1 mediante combinación lineal de polinomios base L_i(x)."
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-semibold">Puntos (x_i, y_i)</h3>
          <PointsEditor points={points} onChange={setPoints} />
          <div>
            <label className="label">Evaluar en x =</label>
            <NumberInput className="input" step="any" value={evalAt} onChange={(v) => setEvalAt(v)} />
          </div>
          <button className="btn-primary w-full" onClick={onSolve} disabled={loading}>
            {loading ? 'Resolviendo...' : 'Construir polinomio'}
          </button>
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold mb-3">Visualización del polinomio interpolante</h3>
          {data?.plotData?.points && (
            <FunctionPlot
              xRange={[Math.min(...points.map((p) => p.x)) - 0.5, Math.max(...points.map((p) => p.x)) + 0.5]}
              marks={points.map((p) => ({ x: p.x, y: p.y, label: `(${p.x}, ${p.y})` }))}
            />
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />
          <div className="card">
            <p className="text-sm text-slate-700"><MathText text={data.steps[stepIdx]?.explanation} /></p>
            {data.steps[stepIdx]?.latex && (
              <div className="mt-2 text-center">
                <KaTeXBlock tex={data.steps[stepIdx].latex!} />
              </div>
            )}
          </div>
          <Tabs
            tabs={[
              { id: 'steps', label: 'Pasos', content: <IterationsTable steps={data.steps} method="lagrange" highlightIndex={stepIdx} onRowClick={setStepIdx} /> },
              {
                id: 'result',
                label: 'Polinomio resultante',
                content: (
                  <div className="card whitespace-pre-wrap font-mono text-sm">
                    <MathText text={data.result.polynomial} />
                    {data.result.evaluatedValue !== undefined && (
                      <p className="mt-3 font-sans text-slate-700">
                        <strong>P({data.result.evaluatedAt}) = {data.result.evaluatedValue}</strong>
                      </p>
                    )}
                  </div>
                ),
              },
              {
                id: 'practice',
                label: 'Practicar',
                content: (
                  <div className="space-y-4">
                    <StepInputForm
                      numIterations={Math.min(points.length, data.steps.length)}
                      fields={[
                        { key: 'xi', label: 'x_i' },
                        { key: 'yi', label: 'y_i' },
                        { key: 'denominator', label: '\\text{Denominador } L_i' },
                      ]}
                      onSubmit={validateSteps}
                      loading={validator.loading}
                    />
                    {validator.data && <FeedbackPanel {...validator.data} />}
                    {validator.error && <p className="text-sm text-rose-700">{validator.error}</p>}
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
