import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { TableauView } from '@/components/math/TableauView';
import { StepPlayer } from '@/components/math/StepPlayer';
import { saveAttempt, useSolver } from '@/hooks/useSolver';

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

  const numVars = c.length;

  const setVarsCount = (n: number) => {
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
      saveAttempt({ methodSlug: 'simplex', input: { objective, c, constraints }, steps: r.steps, isCorrect: !r.result.unbounded });
    }
  };

  return (
    <div>
      <PageHeader
        title="Método Símplex"
        category="Investigación de Operaciones · Programación Lineal"
        description="Resuelve problemas de programación lineal mediante el método tabular estándar."
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
            <input className="input" type="number" min={2} max={6} value={numVars} onChange={(e) => setVarsCount(Number(e.target.value))} />
          </div>

          <div>
            <label className="label">Coeficientes Z</label>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${numVars}, 1fr)` }}>
              {c.map((v, i) => (
                <input
                  key={i}
                  className="input font-mono"
                  type="number"
                  step="any"
                  value={v}
                  onChange={(e) => {
                    const next = [...c];
                    next[i] = Number(e.target.value);
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
                      <input
                        key={j}
                        className="input font-mono"
                        type="number"
                        step="any"
                        value={v}
                        onChange={(e) => {
                          const next = [...constraints];
                          next[i].coefficients[j] = Number(e.target.value);
                          setConstraints(next);
                        }}
                      />
                    ))}
                  </div>
                  <select
                    className="input w-16"
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
                  <input
                    className="input font-mono w-20"
                    type="number"
                    step="any"
                    value={ct.rhs}
                    onChange={(e) => {
                      const next = [...constraints];
                      next[i].rhs = Number(e.target.value);
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
              {data.result.unbounded ? (
                <p className="text-rose-700">Problema no acotado.</p>
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
            />
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          <StepPlayer total={data.steps.length} index={stepIdx} onChange={setStepIdx} />
          <div className="card">
            <p className="text-sm text-slate-700">{data.steps[stepIdx]?.explanation}</p>
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
                        <p className="text-sm text-slate-600 mb-1">Iteración {s.iteration}</p>
                        <TableauView
                          flat={s.state.tableau as number[]}
                          rows={s.state.rows as number}
                          cols={s.state.cols as number}
                          basis={s.state.basis as number[] | undefined}
                          pivotRow={s.state.pivotRow as number | undefined}
                          pivotCol={s.state.pivotCol as number | undefined}
                        />
                      </div>
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
