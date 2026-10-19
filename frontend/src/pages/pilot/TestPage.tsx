import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

// Las preguntas llegan del servidor sin la clave de respuestas; la calificación
// también se hace allá (POST /pilot/test devuelve el puntaje).
type Pregunta = { id: string; text: string; options: string[] };

export function TestPage({ testType, title }: { testType: 'PRE' | 'POST'; title: string }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);

  useEffect(() => {
    api.get<Pregunta[]>('/pilot/cuestionario').then((r) => setPreguntas(r.data));
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/pilot/test', { testType, answers });
      setSubmitted({ score: data.score, correct: data.correct, total: data.total });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        category="Validación pedagógica"
        description="Cuestionario diagnóstico de 6 preguntas con única respuesta correcta. Resultados se guardan para el análisis cuasi-experimental pre/post-test descrito en el objetivo específico 4."
      />

      {submitted ? (
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Resultado registrado ✓</h3>
          <p className="text-slate-700">Aciertos: <strong>{submitted.correct}</strong> / {submitted.total}</p>
          <p className="text-slate-700">Puntuación: <strong>{submitted.score}</strong> / 100</p>
        </div>
      ) : (
        <div className="space-y-4">
          {preguntas.map((q, i) => (
            <div key={q.id} className="card">
              <p className="font-medium mb-3">{i + 1}. {q.text}</p>
              <div className="space-y-2">
                {q.options.map((opt, k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === k}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: k }))}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={submit} disabled={loading || preguntas.length === 0 || Object.keys(answers).length < preguntas.length}>
            {loading ? 'Guardando...' : 'Enviar respuestas'}
          </button>
        </div>
      )}
    </div>
  );
}
