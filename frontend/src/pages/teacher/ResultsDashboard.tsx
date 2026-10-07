import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

interface Summary {
  preCount: number;
  postCount: number;
  preAvg: number;
  postAvg: number;
  improvement: number;
  susCount: number;
  susAvg: number;
}

export function ResultsDashboard() {
  const [data, setData] = useState<{ tests: any[]; sus: any[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pilot/results').then(({ data }) => {
      setData(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const exportCsv = (rows: any[], filename: string, mapper: (r: any) => Record<string, any>) => {
    if (rows.length === 0) return;
    const mapped = rows.map(mapper);
    const headers = Object.keys(mapped[0]);
    const csv = [
      headers.join(','),
      ...mapped.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-sm text-slate-500">Cargando...</p>;
  if (!data) return <p className="text-sm text-rose-700">Error cargando resultados.</p>;

  return (
    <div>
      <PageHeader
        title="Resultados de validación pedagógica"
        category="Panel docente"
        description="Resumen estadístico y exportación CSV de las pruebas pre/post-test y la encuesta SUS."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Stat label="Pre-test promedio" value={`${data.summary.preAvg} / 100`} sub={`n=${data.summary.preCount}`} />
        <Stat label="Pos-test promedio" value={`${data.summary.postAvg} / 100`} sub={`n=${data.summary.postCount}`} />
        <Stat label="Mejora promedio" value={`${data.summary.improvement > 0 ? '+' : ''}${data.summary.improvement} pts`} sub="pos − pre" />
        <Stat label="SUS promedio" value={`${data.summary.susAvg} / 100`} sub={`n=${data.summary.susCount}`} />
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Resultados pre/post-test</h3>
          <button
            className="btn-secondary text-xs"
            onClick={() => exportCsv(data.tests, 'pre-post-test.csv', (r) => ({
              fecha: r.createdAt,
              estudiante: r.user?.fullName ?? '',
              email: r.user?.email ?? '',
              tipo: r.testType,
              score: r.score,
            }))}
          >
            Exportar CSV
          </button>
        </div>
        <table className="table-clean">
          <thead>
            <tr><th>Fecha</th><th>Estudiante</th><th>Tipo</th><th>Puntaje</th></tr>
          </thead>
          <tbody>
            {data.tests.slice(0, 50).map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.createdAt).toLocaleString()}</td>
                <td>{t.user?.fullName}</td>
                <td>{t.testType}</td>
                <td className="font-mono">{Math.round(t.score * 100) / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Encuesta SUS <span className="font-normal text-slate-500 text-sm">(se responde dentro de la encuesta de opinión)</span></h3>
          <button
            className="btn-secondary text-xs"
            onClick={() => exportCsv(data.sus, 'sus.csv', (r) => ({
              fecha: r.createdAt,
              estudiante: r.user?.fullName ?? '',
              score: r.score,
              respuestas: JSON.stringify(r.answers),
            }))}
          >
            Exportar CSV
          </button>
        </div>
        <table className="table-clean">
          <thead>
            <tr><th>Fecha</th><th>Estudiante</th><th>Puntaje</th></tr>
          </thead>
          <tbody>
            {data.sus.slice(0, 50).map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.user?.fullName}</td>
                <td className="font-mono">{Math.round(s.score * 100) / 100}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
