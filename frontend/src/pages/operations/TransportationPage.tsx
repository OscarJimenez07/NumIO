import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/layout/Tabs';
import { StepPlayer } from '@/components/math/StepPlayer';
import { KaTeXBlock } from '@/components/math/KaTeXBlock';
import { MathText } from '@/components/math/MathText';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { StepInputForm } from '@/components/feedback/StepInputForm';
import { saveAttempt, useSolver, useValidator } from '@/hooks/useSolver';
import { NumberInput } from '@/components/math/NumberInput';

/** Suma ignorando los campos que están vacíos mientras se editan. */
const suma = (xs: number[]) => xs.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

export function TransportationPage() {
  const [m, setM] = useState(3);
  const [n, setN] = useState(4);
  const [costs, setCosts] = useState<number[][]>([
    [10, 2, 20, 11],
    [12, 7, 9, 20],
    [4, 14, 16, 18],
  ]);
  const [supply, setSupply] = useState<number[]>([15, 25, 10]);
  const [demand, setDemand] = useState<number[]>([5, 15, 15, 15]);
  const [stepIdx, setStepIdx] = useState(0);

  const { data, loading, error, solve } = useSolver('/operations/transportation');
  const validator = useValidator('/operations/transportation');

  const resize = (newM: number, newN: number) => {
  // Mientras el campo está vacío o fuera de rango se conserva la matriz actual.
    if (![newM, newN].every((k) => Number.isInteger(k) && k >= 2 && k <= 6)) return;
    setM(newM);
    setN(newN);
    setCosts((prev) => {
      const out: number[][] = [];
      for (let i = 0; i < newM; i++) {
        const row = [];
        for (let j = 0; j < newN; j++) row.push(prev[i]?.[j] ?? 0);
        out.push(row);
      }
      return out;
    });
    setSupply((prev) => Array.from({ length: newM }, (_, i) => prev[i] ?? 0));
    setDemand((prev) => Array.from({ length: newN }, (_, j) => prev[j] ?? 0));
  };

  const onSolve = async () => {
    const r = await solve({ costs, supply, demand });
    if (r) {
      setStepIdx(0);
    }
  };

  const validateSteps = async (userSteps: any[]) => {
    const r = await validator.validate({ costs, supply, demand, userSteps });
    if (r) {
      saveAttempt({ methodSlug: 'transportation', input: { costs, supply, demand }, steps: data?.steps ?? [], userSteps, feedback: r.feedback, isCorrect: r.isCorrect });
    }
  };

  // Las asignaciones de Vogel son los primeros pasos (los que tienen cantidad).
  const asignacionesVogel = data ? data.steps.filter((s) => s.state.quantity !== undefined).length : 0;

  return (
    <div>
      <PageHeader
        title="Problema de Transporte"
        category="Investigación de Operaciones"
        description="Solución básica inicial por aproximación de Vogel y optimización iterativa por MODI (Stepping Stone)."
        reference="Taha, H. (2017). Operations Research: An Introduction (10.ª ed.)."
      />

      <div className="card mb-6">
        <div className="flex gap-3 mb-4 items-end">
          <div>
            <label className="label">Fuentes (m)</label>
            <NumberInput className="input w-20" min={2} max={6} value={m} onChange={(v) => resize(v, n)} />
          </div>
          <div>
            <label className="label">Destinos (n)</label>
            <NumberInput className="input w-20" min={2} max={6} value={n} onChange={(v) => resize(m, v)} />
          </div>
          <button className="btn-primary ml-auto" onClick={onSolve} disabled={loading}>
            {loading ? 'Resolviendo...' : 'Resolver (Vogel + MODI)'}
          </button>
        </div>
        {error && <p className="text-sm text-rose-700 mb-2">{error}</p>}

        <table className="table-clean">
          <thead>
            <tr>
              <th></th>
              {Array.from({ length: n }, (_, j) => <th key={j}>D{j + 1}</th>)}
              <th className="bg-amber-100">Oferta</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((row, i) => (
              <tr key={i}>
                <td className="font-medium">F{i + 1}</td>
                {row.map((v, j) => (
                  <td key={j}>
                    <NumberInput
                      className="input font-mono w-16"
                      step="any"
                      value={v}
                      onChange={(v) => {
                        const next = costs.map((r) => [...r]);
                        next[i][j] = v;
                        setCosts(next);
                      }}
                    />
                  </td>
                ))}
                <td className="bg-amber-50">
                  <NumberInput
                    className="input font-mono w-20"
                    step="any"
                    value={supply[i]}
                    onChange={(v) => {
                      const next = [...supply];
                      next[i] = v;
                      setSupply(next);
                    }}
                  />
                </td>
              </tr>
            ))}
            <tr className="bg-amber-50">
              <td className="font-medium">Demanda</td>
              {demand.map((v, j) => (
                <td key={j}>
                  <NumberInput
                    className="input font-mono w-16"
                    step="any"
                    value={v}
                    onChange={(v) => {
                      const next = [...demand];
                      next[j] = v;
                      setDemand(next);
                    }}
                  />
                </td>
              ))}
              <td>
                {suma(supply)} / {suma(demand)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-2">Solución óptima</h3>
            <p><strong>Costo total mínimo: </strong><span className="font-mono">{data.result.totalCost}</span></p>
            <table className="table-clean mt-3">
              <thead>
                <tr>
                  <th></th>
                  {Array.from({ length: n }, (_, j) => <th key={j}>D{j + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                {(data.result.allocation as number[][]).map((row, i) => (
                  <tr key={i}>
                    <td className="font-medium">F{i + 1}</td>
                    {row.map((v, j) => (
                      <td key={j} className={`font-mono ${v > 0 ? 'bg-emerald-50 font-semibold' : ''}`}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                id: 'steps',
                label: 'Iteraciones',
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
                            <td className="text-sm"><MathText text={s.explanation} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                      numIterations={asignacionesVogel}
                      description="Construye la solución inicial por aproximación de Vogel: en cada asignación ingresa la celda elegida (número de fuente F y de destino D), la cantidad enviada y el costo total acumulado hasta ese paso (en la última fila, el costo de la solución inicial)."
                      fields={[
                        { key: 'fila', label: '\\text{Fuente } F_i' },
                        { key: 'columna', label: '\\text{Destino } D_j' },
                        { key: 'cantidad', label: 'x_{ij}' },
                        { key: 'costoAcumulado', label: '\\text{Costo acumulado}' },
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
