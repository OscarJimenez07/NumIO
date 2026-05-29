import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

const QUESTIONS = [
  {
    id: 'q1',
    text: '¿Cuál es la condición necesaria para aplicar el método de Bisección en [a, b]?',
    options: [
      'f(a) y f(b) tienen el mismo signo',
      'f(a) · f(b) < 0',
      'f es derivable en [a, b]',
      'a > b',
    ],
    correct: 1,
  },
  {
    id: 'q2',
    text: 'El método de Newton-Raphson requiere conocer:',
    options: [
      'La integral de f',
      'Un intervalo donde f cambia de signo',
      "La derivada f'(x) y un valor inicial x₀",
      'Una tabla de diferencias divididas',
    ],
    correct: 2,
  },
  {
    id: 'q3',
    text: 'La regla de Simpson 1/3 requiere que el número de subintervalos n sea:',
    options: ['Impar', 'Par', 'Múltiplo de 3', 'Cualquiera'],
    correct: 1,
  },
  {
    id: 'q4',
    text: 'En el método Símplex, el criterio de optimalidad para maximización es:',
    options: [
      'Todos los coeficientes en la fila Z son no positivos',
      'Todos los coeficientes en la fila Z son no negativos',
      'El RHS es positivo',
      'No hay variables artificiales',
    ],
    correct: 1,
  },
  {
    id: 'q5',
    text: 'La aproximación de Vogel se utiliza para:',
    options: [
      'Encontrar la solución óptima de un problema de transporte',
      'Construir una solución básica inicial en transporte',
      'Asignar tareas a personas',
      'Calcular derivadas numéricas',
    ],
    correct: 1,
  },
  {
    id: 'q6',
    text: 'El algoritmo Húngaro resuelve problemas de:',
    options: ['Programación lineal entera', 'Asignación 1-a-1', 'Integración numérica', 'Interpolación'],
    correct: 1,
  },
];

export function TestPage({ testType, title }: { testType: 'PRE' | 'POST'; title: string }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    let correct = 0;
    for (const q of QUESTIONS) if (answers[q.id] === q.correct) correct++;
    const score = (correct / QUESTIONS.length) * 100;
    try {
      await api.post('/pilot/test', { testType, score, details: { answers, questions: QUESTIONS.map((q) => ({ id: q.id, text: q.text, correct: q.correct })) } });
      setSubmitted({ score: Math.round(score * 100) / 100, correct, total: QUESTIONS.length });
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
          {QUESTIONS.map((q, i) => (
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
          <button className="btn-primary" onClick={submit} disabled={loading || Object.keys(answers).length < QUESTIONS.length}>
            {loading ? 'Guardando...' : 'Enviar respuestas'}
          </button>
        </div>
      )}
    </div>
  );
}
