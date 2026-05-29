import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { FunctionPlot } from '@/components/math/FunctionPlot';
import { IterationsTable } from '@/components/math/IterationsTable';
import { StepPlayer } from '@/components/math/StepPlayer';
import { KaTeXBlock } from '@/components/math/KaTeXBlock';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { StepInputForm } from '@/components/feedback/StepInputForm';
import { saveAttempt, useSolver, useValidator } from '@/hooks/useSolver';

export function BisectionPage() {
  const [fn, setFn] = useState('x^3 - x - 2');
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [tol, setTol] = useState(0.0001);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver('/numerical/bisection');
  const validator = useValidator('/numerical/bisection');

  const onSolve = async () => {
    const r = await solve({ fn, a, b, tolerance: tol });
    if (r) {
      setStepIdx(0);
      saveAttempt({ methodSlug: 'bisection', input: { fn, a, b, tolerance: tol }, steps: r.steps, isCorrect: r.result.converged });
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ fn, a, b, tolerance: tol, userSteps });
    if (r) {
      saveAttempt({ methodSlug: 'bisection', input: { fn, a, b, tolerance: tol }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
    }
  };

  return (
    <div>
      <PageHeader
        title="Método de Bisección"
        category="Análisis Numérico · Raíces"
        description="Método cerrado que reduce iterativamente el intervalo a la mitad para localizar una raíz cuando f(a)·f(b) < 0."
        reference="Burden, R. & Faires, J. (2011). Numerical Analysis (9.ª ed.)."
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1">
          <h3 className="font-semibold mb-3">Datos de entrada</h3>
          <div className="space-y-3">
            <div>
              <label className="label">f(x)</label>
              <input className="input font-mono" value={fn} onChange={(e) => setFn(e.target.value)} placeholder="x^3 - x - 2" />
              <p className="text-xs text-slate-500 mt-1">
                <KaTeXBlock tex={`f(x) = ${fn}`} displayMode={false} />
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">a</label>
                <input className="input" type="number" step="any" value={a} onChange={(e) => setA(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">b</label>
                <input className="input" type="number" step="any" value={b} onChange={(e) => setB(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="label">Tolerancia</label>
              <input className="input" type="number" step="any" value={tol} onChange={(e) => setTol(Number(e.target.value))} />
            </div>
            <button className="btn-primary w-full" onClick={onSolve} disabled={loading}>
              {loading ? 'Resolviendo...' : 'Resolver automáticamente'}
            </button>
            {error && <p className="text-sm text-rose-700">{error}</p>}
          </div>
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold mb-3">Visualización</h3>
          <FunctionPlot
            fn={fn}
            xRange={[a - 0.5, b + 0.5]}
            marks={data?.steps.map((s) => ({ x: s.state.c as number, y: s.state.fc as number, label: `c${s.iteration}` })) ?? []}
            highlightIndex={stepIdx}
          />
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />

          <div className="card">
            <p className="text-sm text-slate-700">{data.steps[stepIdx]?.explanation}</p>
            {data.steps[stepIdx]?.latex && (
              <div className="mt-2 text-center">
                <KaTeXBlock tex={data.steps[stepIdx].latex!} />
              </div>
            )}
          </div>

          <Tabs
            tabs={[
              {
                id: 'auto',
                label: 'Resultado paso a paso',
                content: <IterationsTable steps={data.steps} highlightIndex={stepIdx} onRowClick={setStepIdx} />,
              },
              {
                id: 'practice',
                label: 'Practicar paso a paso',
                content: (
                  <div className="space-y-4">
                    <StepInputForm
                      numIterations={Math.min(5, data.steps.length)}
                      fields={[
                        { key: 'a', label: 'a' },
                        { key: 'b', label: 'b' },
                        { key: 'c', label: 'c' },
                        { key: 'fc', label: 'f(c)' },
                      ]}
                      onSubmit={validateSteps}
                      loading={validator.loading}
                    />
                    {validator.data && <FeedbackPanel {...validator.data} />}
                  </div>
                ),
              },
              {
                id: 'result',
                label: 'Resumen',
                content: (
                  <div className="card">
                    <p><strong>Raíz aproximada:</strong> <span className="font-mono">{data.result.root}</span></p>
                    <p><strong>f(raíz):</strong> <span className="font-mono">{data.result.fAtRoot}</span></p>
                    <p><strong>Iteraciones:</strong> {data.result.iterations}</p>
                    <p><strong>Error final:</strong> <span className="font-mono">{data.result.finalError}</span></p>
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
