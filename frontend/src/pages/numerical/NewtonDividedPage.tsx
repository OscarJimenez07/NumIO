import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { FunctionPlot } from '@/components/math/FunctionPlot';
import { IterationsTable } from '@/components/math/IterationsTable';
import { StepPlayer } from '@/components/math/StepPlayer';
import { KaTeXBlock } from '@/components/math/KaTeXBlock';
import { MathText } from '@/components/math/MathText';
import { PointsEditor } from '@/components/math/PointsEditor';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { StepInputForm } from '@/components/feedback/StepInputForm';
import { saveAttempt, useSolver, useValidator } from '@/hooks/useSolver';
import { NumberInput } from '@/components/math/NumberInput';

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
  const validator = useValidator('/numerical/newton-divided');

  const onSolve = async () => {
    const r = await solve({ points, evalAt });
    if (r) {
      setStepIdx(0);
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ points, evalAt, userSteps });
    if (r) {
      saveAttempt({ methodSlug: 'newton-divided', input: { points, evalAt }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
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
            <NumberInput className="input" step="any" value={evalAt} onChange={(v) => setEvalAt(v)} />
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
              { id: 'steps', label: 'Pasos', content: <IterationsTable steps={data.steps} method="newton-divided" highlightIndex={stepIdx} onRowClick={setStepIdx} /> },
              {
                id: 'poly',
                label: 'Polinomio',
                content: (
                  <div className="card font-mono text-sm whitespace-pre-wrap">
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
              {
                id: 'practice',
                label: 'Practicar',
                content: (
                  <div className="space-y-4">
                    <StepInputForm
                      key={data.steps.length}
                      numIterations={(data.result.coefficients as number[]).length}
                      rowLabel={(k) => `k = ${k}`}
                      description={
                        data.result.evaluatedValue !== undefined
                          ? `En cada fila k ingresa el coeficiente b_k = f[x_0, …, x_k], el término T_k evaluado en x = ${data.result.evaluatedAt} y la suma T_0 + … + T_k (la última es P(x)).`
                          : 'En cada fila k ingresa el coeficiente b_k = f[x_0, …, x_k].'
                      }
                      fields={[
                        { key: 'coeficiente', label: 'b_k' },
                        ...(data.result.evaluatedValue !== undefined
                          ? [
                              { key: 'termino', label: 'T_k' },
                              { key: 'sumaParcial', label: 'T_0 + \\dots + T_k' },
                            ]
                          : []),
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
