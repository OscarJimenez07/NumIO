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

interface Props {
  title: string;
  slug: 'trapezoidal' | 'simpson-1-3' | 'simpson-3-8';
  description: string;
  defaultN?: number;
}

export function IntegrationPage({ title, slug, description, defaultN = 4 }: Props) {
  const [fn, setFn] = useState('x^2');
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const [n, setN] = useState(defaultN);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver(`/numerical/${slug}`);
  const validator = useValidator(`/numerical/${slug}`);

  const onSolve = async () => {
    const r = await solve({ fn, a, b, n });
    if (r) {
      setStepIdx(0);
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ fn, a, b, n, userSteps });
    if (r) {
      saveAttempt({ methodSlug: slug, input: { fn, a, b, n }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        category="Análisis Numérico · Integración"
        description={description}
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1 space-y-3">
          <div>
            <label className="label">f(x)</label>
            <input className="input font-mono" value={fn} onChange={(e) => setFn(e.target.value)} />
            <p className="text-xs text-slate-500 mt-1"><KaTeXBlock tex={`\\int_{${a}}^{${b}} ${fn} \\, dx`} displayMode={false} /></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">a</label>
              <NumberInput className="input" step="any" value={a} onChange={(v) => setA(v)} />
            </div>
            <div>
              <label className="label">b</label>
              <NumberInput className="input" step="any" value={b} onChange={(v) => setB(v)} />
            </div>
          </div>
          <div>
            <label className="label">n (subintervalos)</label>
            <NumberInput className="input" min={1} value={n} onChange={(v) => setN(v)} />
          </div>
          <button className="btn-primary w-full" onClick={onSolve} disabled={loading}>
            {loading ? 'Calculando...' : 'Calcular integral'}
          </button>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          {data && (
            <div className="text-sm text-slate-700 mt-2 border-t border-slate-200 pt-2">
              <p><strong>Integral ≈</strong> <span className="font-mono">{data.result.integral}</span></p>
              <p><strong>h =</strong> <span className="font-mono">{data.result.h}</span></p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-semibold mb-3">Visualización con área sombreada</h3>
          <FunctionPlot
            fn={fn}
            xRange={[a - 0.2, b + 0.2]}
            marks={data?.plotData?.marks ?? []}
            highlightIndex={stepIdx}
            fillIntegralFrom={[a, b]}
          />
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />
          <div className="card">
            <p className="text-sm text-slate-700"><MathText text={data.steps[stepIdx]?.explanation} /></p>
            {data.steps[stepIdx]?.latex && <div className="mt-2 text-center"><KaTeXBlock tex={data.steps[stepIdx].latex!} /></div>}
          </div>

          <Tabs
            tabs={[
              { id: 'steps', label: 'Tabla de evaluaciones', content: <IterationsTable steps={data.steps} method="integration" highlightIndex={stepIdx} onRowClick={setStepIdx} /> },
              {
                id: 'practice',
                label: 'Practicar',
                content: (
                  <div className="space-y-4">
                    <StepInputForm
                      numIterations={Math.min(n + 1, data.steps.length)}
                      fields={[
                        { key: 'i', label: 'i' },
                        { key: 'x', label: 'x_i' },
                        { key: 'y', label: 'f(x_i)' },
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
