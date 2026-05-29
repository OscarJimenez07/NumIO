import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Attempt {
  id: string;
  isCorrect: boolean;
  createdAt: string;
  method: { name: string; category: string; slug: string };
}

export function StudentDashboard() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attempts/me').then(({ data }) => {
      setAttempts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const correct = attempts.filter((a) => a.isCorrect).length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Mi panel</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Intentos totales" value={attempts.length} />
        <Stat label="Correctos" value={correct} />
        <Stat label="Tasa de acierto" value={attempts.length ? `${Math.round((correct / attempts.length) * 100)}%` : '—'} />
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Historial reciente</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : attempts.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no has resuelto ningún ejercicio.</p>
        ) : (
          <table className="table-clean">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Método</th>
                <th>Categoría</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>{a.method.name}</td>
                  <td>{a.method.category}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded text-xs ${a.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {a.isCorrect ? 'Correcto' : 'Con errores'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}
