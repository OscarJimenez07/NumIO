import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { TableauView } from '@/components/math/TableauView';
import { StepPlayer } from '@/components/math/StepPlayer';
import { KaTeXBlock } from '@/components/math/KaTeXBlock';
import { MathText } from '@/components/math/MathText';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { StepInputForm } from '@/components/feedback/StepInputForm';
import { saveAttempt, useSolver, useValidator } from '@/hooks/useSolver';
import { NumberInput } from '@/components/math/NumberInput';

interface Constraint { coefficients: number[]; operator: '<=' | '>=' | '='; rhs: number; }

export function SimplexPage() {
  const [objective, setObjective] = useState<'max' | 'min'>('max');
  const [c, setC] = useState<number[]>([3, 5]);
  const [constraints, setConstraints] = useState<Constraint[]>([
    { coefficients: [1, 0], operator: '<=', rhs: 4 },
    { coefficients: [0, 2], operator: '<=', rhs: 12 },
    { coefficients: [3, 2], operator: '<=', rhs: 18 },
  ]);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver('/operations/simplex');
  const validator = useValidator('/operations/simplex');

  const numVars = c.length;

  const setVarsCount = (n: number) => {
  // Mientras el campo está vacío o fuera de rango se conserva el modelo actual.
    if (!Number.isInteger(n) || n < 2 || n > 6) return;
    setC((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(0);
      while (next.length > n) next.pop();
      return next;
    });
    setConstraints((prev) =>
      prev.map((ct) => {
        const coefs = [...ct.coefficients];
        while (coefs.length < n) coefs.push(0);
        while (coefs.length > n) coefs.pop();
        return { ...ct, coefficients: coefs };
      }),
    );
  };

  const addConstraint = () => setConstraints([...constraints, { coefficients: Array(numVars).fill(0), operator: '<=', rhs: 0 }]);
  const removeConstraint = (i: number) => setConstraints(constraints.filter((_, k) => k !== i));

  const onSolve = async () => {
    const r = await solve({ objective, c, constraints });
    if (r) {
      setStepIdx(0);
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ objective, c, constraints, userSteps });
    if (r) {
      saveAttempt({ methodSlug: 'simplex', input: { objective, c, constraints }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
    }
  };

  // Cada pivoteo (de cualquier fase) es una fila de la práctica.
  const pivoteos = data ? data.steps.filter((s) => s.state.pivotRow !== undefined).length : 0;

  return (
    <div>
      <PageHeader
        title="Método Símplex"
        category="Investigación de Operaciones · Programación Lineal"
        description="Resuelve problemas de programación lineal con el método símplex tabular; las restricciones «≥» e «=» se resuelven con el método de las dos fases."
        reference="Hillier, F. & Lieberman, G. (2015). Introducción a la investigación de operaciones."
      />

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card lg:col-span-1 space-y-3">
          <h3 className="font-semibold">Modelo</h3>

          <div>
            <label className="label">Objetivo</label>
            <select className="input" value={objective} onChange={(e) => setObjective(e.target.value as any)}>
              <option value="max">Maximizar</option>
              <option value="min">Minimizar</option>
            </select>
          </div>

          <div>
            <label className="label"># variables</label>
            <NumberInput className="input" min={2} max={6} value={numVars} onChange={(v) => setVarsCount(v)} />
          </div>

          <div>
            <label className="label">Coeficientes Z</label>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${numVars}, 1fr)` }}>
              {c.map((v, i) => (
                <NumberInput
                  key={i}
                  className="input font-mono"
                  step="any"
                  value={v}
                  onChange={(v) => {
                    const next = [...c];
                    next[i] = v;
                    setC(next);
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Restricciones</label>
            <div className="space-y-2">
              {constraints.map((ct, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="grid flex-1 gap-1" style={{ gridTemplateColumns: `repeat(${numVars}, 1fr)` }}>
                    {ct.coefficients.map((v, j) => (
                      <NumberInput
                        key={j}
                        className="input min-w-0 px-1 text-center font-mono"
                        step="any"
                        value={v}
                        onChange={(v) => {
                          const next = [...constraints];
                          next[i].coefficients[j] = v;
                          setConstraints(next);
                        }}
                      />
                    ))}
                  </div>
                  <select
                    className="input w-14 shrink-0 px-1"
                    value={ct.operator}
                    onChange={(e) => {
                      const next = [...constraints];
                      next[i].operator = e.target.value as any;
                      setConstraints(next);
                    }}
                  >
                    <option value="<=">&le;</option>
                    <option value=">=">&ge;</option>
                    <option value="=">=</option>
                  </select>
                  <NumberInput
                    className="input w-16 shrink-0 px-1 text-center font-mono"
                    step="any"
                    value={ct.rhs}
                    onChange={(v) => {
                      const next = [...constraints];
                      next[i].rhs = v;
                      setConstraints(next);
                    }}
                  />
                  <button className="btn-ghost text-rose-700" onClick={() => removeConstraint(i)}>✕</button>
                </div>
              ))}
              <button className="btn-secondary text-xs" onClick={addConstraint}>+ Restricción</button>
            </div>
          </div>

          <button className="btn-primary w-full" onClick={onSolve} disabled={loading}>
            {loading ? 'Resolviendo...' : 'Resolver'}
          </button>
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {data && (
            <div className="card">
              <h3 className="font-semibold mb-2">Solución óptima</h3>
              {data.result.unbounded || data.result.infeasible ? (
                <p className="text-rose-700">{data.message ?? (data.result.unbounded ? 'Problema no acotado.' : 'Problema infactible.')}</p>
              ) : (
                <>
                  <p><strong>Z = </strong><span className="font-mono">{data.result.z}</span></p>
                  <p className="font-mono text-sm mt-1">x = ({(data.result.x as number[]).join(', ')})</p>
                </>
              )}
            </div>
          )}
          {data && data.steps[stepIdx] && (
            <TableauView
              flat={data.steps[stepIdx].state.tableau as number[]}
              rows={data.steps[stepIdx].state.rows as number}
              cols={data.steps[stepIdx].state.cols as number}
              basis={data.steps[stepIdx].state.basis as number[] | undefined}
              pivotRow={data.steps[stepIdx].state.pivotRow as number | undefined}
              pivotCol={data.steps[stepIdx].state.pivotCol as number | undefined}
              varNames={data.steps[stepIdx].state.varNames as string[] | undefined}
              objectiveLabel={data.steps[stepIdx].state.phase === 1 ? 'W' : 'Z'}
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
              {
                id: 'all',
                label: 'Todas las iteraciones',
                content: (
                  <div className="space-y-3">
                    {data.steps.map((s, i) => (
                      <div key={i}>
                        <p className="text-sm text-slate-600 mb-1">
                          {s.state.phase ? `Fase ${s.state.phase} · ` : ''}Paso {s.iteration}
                        </p>
                        <TableauView
                          flat={s.state.tableau as number[]}
                          rows={s.state.rows as number}
                          cols={s.state.cols as number}
                          basis={s.state.basis as number[] | undefined}
                          pivotRow={s.state.pivotRow as number | undefined}
                          pivotCol={s.state.pivotCol as number | undefined}
                          varNames={s.state.varNames as string[] | undefined}
                          objectiveLabel={s.state.phase === 1 ? 'W' : 'Z'}
                        />
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: 'practice',
                label: 'Practicar',
                content:
                  pivoteos === 0 ? (
                    <div className="card text-sm text-slate-600">
                      La tabla inicial ya es óptima: no hay pivoteos que practicar con este modelo.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <StepInputForm
                        key={data.steps.length}
                        numIterations={pivoteos}
                        description="Por cada pivoteo ingresa la variable que entra y la que sale (p. ej. x1, s2, a1), el elemento pivote antes de dividir y el valor del objetivo después de pivotear (W en la fase 1, Z en la fase 2)."
                        fields={[
                          { key: 'entra', label: '\\text{Entra}', type: 'text', placeholder: 'x1' },
                          { key: 'sale', label: '\\text{Sale}', type: 'text', placeholder: 's1' },
                          { key: 'pivote', label: '\\text{Pivote}' },
                          { key: 'z', label: 'Z \\text{ (o } W)' },
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
