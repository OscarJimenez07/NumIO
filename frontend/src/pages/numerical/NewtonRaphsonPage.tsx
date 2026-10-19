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
import { NumberInput } from '@/components/math/NumberInput';

export function NewtonRaphsonPage() {
  const [fn, setFn] = useState('x^2 - 2');
  const [x0, setX0] = useState(1);
  const [tol, setTol] = useState(1e-6);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver('/numerical/newton-raphson');
  const validator = useValidator('/numerical/newton-raphson');

  const onSolve = async () => {
    const r = await solve({ fn, x0, tolerance: tol });
    if (r) {
      setStepIdx(0);
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ fn, x0, tolerance: tol, userSteps });
    if (r) {
      saveAttempt({ methodSlug: 'newton-raphson', input: { fn, x0, tolerance: tol }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
    }
  };

  return (
    <div>
      <PageHeader
        title="Método de Newton-Raphson"
        category="Análisis Numérico · Raíces"
        description="Método abierto que usa la derivada de f para construir aproximaciones sucesivas de la raíz."
        reference="Chapra, S. & Canale, R. (2015). Métodos numéricos para ingenieros (7.ª ed.)."
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1">
          <h3 className="font-semibold mb-3">Datos de entrada</h3>
          <div className="space-y-3">
            <div>
              <label className="label">f(x)</label>
              <input className="input font-mono" value={fn} onChange={(e) => setFn(e.target.value)} />
              <p className="text-xs text-slate-500 mt-1"><KaTeXBlock tex={`f(x) = ${fn}`} displayMode={false} /></p>
            </div>
            <div>
              <label className="label">x₀</label>
              <NumberInput className="input" step="any" value={x0} onChange={(v) => setX0(v)} />
            </div>
            <div>
              <label className="label">Tolerancia</label>
              <NumberInput className="input" step="any" value={tol} onChange={(v) => setTol(v)} />
            </div>
            <button className="btn-primary w-full" onClick={onSolve} disabled={loading}>
              {loading ? 'Resolviendo...' : 'Resolver'}
            </button>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            {data && (
              <p className="text-xs text-slate-500 mt-2">
                Derivada simbólica: <span className="font-mono">{data.result.derivative}</span>
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold mb-3">Visualización</h3>
          <FunctionPlot
            fn={fn}
            xRange={[Math.min(x0 - 2, (data?.result.root ?? x0) - 2), Math.max(x0 + 2, (data?.result.root ?? x0) + 2)]}
            marks={data?.steps.map((s) => ({ x: s.state.x as number, y: s.state.fx as number, label: `x${s.iteration}` })) ?? []}
            highlightIndex={stepIdx}
          />
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />
          <div className="card">
            <p className="text-sm text-slate-700"><MathText text={data.steps[stepIdx]?.explanation} /></p>
            {data.steps[stepIdx]?.latex && (
              <div className="mt-2 text-center"><KaTeXBlock tex={data.steps[stepIdx].latex!} /></div>
            )}
          </div>

          <Tabs
            tabs={[
              { id: 'auto', label: 'Iteraciones', content: <IterationsTable steps={data.steps} method="newton-raphson" highlightIndex={stepIdx} onRowClick={setStepIdx} /> },
              {
                id: 'practice',
                label: 'Practicar',
                content: (
                  <div className="space-y-4">
                    <StepInputForm
                      numIterations={Math.min(5, data.steps.length)}
                      fields={[
                        { key: 'x', label: 'x_n' },
                        { key: 'fx', label: 'f(x_n)' },
                        { key: 'dfx', label: "f'(x_n)" },
                        { key: 'xNext', label: 'x_{n+1}' },
                      ]}
                      onSubmit={validateSteps}
                      loading={validator.loading}
                    />
                    {validator.data && <FeedbackPanel {...validator.data} />}
                    {validator.error && <p className="text-sm text-rose-700">{validator.error}</p>}
                  </div>
                ),
              },
              {
                id: 'result',
                label: 'Resumen',
                content: (
                  <div className="card">
                    <p><strong>Raíz:</strong> <span className="font-mono">{data.result.root}</span></p>
                    <p><strong>f(raíz):</strong> <span className="font-mono">{data.result.fAtRoot}</span></p>
                    <p><strong>Iteraciones:</strong> {data.result.iterations}</p>
                    <p><strong>Convergió:</strong> {data.result.converged ? 'Sí ✓' : 'No'}</p>
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
