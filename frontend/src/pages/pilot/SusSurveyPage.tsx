import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

const SUS_ITEMS = [
  'Creo que me gustaría usar este sistema con frecuencia.',
  'Encontré el sistema innecesariamente complejo.',
  'Pensé que el sistema era fácil de usar.',
  'Creo que necesitaría apoyo de un técnico para poder usarlo.',
  'Encontré que las funciones del sistema estaban bien integradas.',
  'Pensé que había demasiada inconsistencia en el sistema.',
  'Imagino que la mayoría de la gente aprendería a usar este sistema rápidamente.',
  'Encontré el sistema muy engorroso de usar.',
  'Me sentí muy seguro/a usando el sistema.',
  'Necesité aprender muchas cosas antes de poder empezar a usar el sistema.',
];

const LIKERT_LABELS = ['Totalmente en desacuerdo', 'En desacuerdo', 'Neutral', 'De acuerdo', 'Totalmente de acuerdo'];

export function SusSurveyPage() {
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(0));
  const [result, setResult] = useState<{ score: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (answers.some((v) => v < 1)) return;
    setLoading(true);
    try {
      const { data } = await api.post('/pilot/sus', { answers });
      setResult({ score: data.score });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Encuesta SUS — Escala de Usabilidad del Sistema"
        category="Validación pedagógica"
        description="Instrumento estandarizado de 10 ítems en escala Likert 1-5 para medir la usabilidad de la plataforma. Puntuación final entre 0 y 100."
      />

      {result ? (
        <div className="card">
          <h3 className="text-xl font-semibold text-slate-800 mb-2">¡Gracias por tu retroalimentación!</h3>
          <p className="text-slate-700">Tu puntuación SUS: <strong>{result.score}</strong> / 100</p>
          <p className="text-sm text-slate-500 mt-2">
            Referencia: una puntuación &gt; 68 se considera por encima del promedio (Bangor, Kortum & Miller).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {SUS_ITEMS.map((item, i) => (
            <div key={i} className="card">
              <p className="text-sm font-medium mb-3">{i + 1}. {item}</p>
              <div className="grid grid-cols-5 gap-1">
                {LIKERT_LABELS.map((lbl, k) => (
                  <label key={k} className={`text-center text-xs p-2 rounded cursor-pointer border ${answers[i] === k + 1 ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name={`sus-${i}`}
                      className="hidden"
                      checked={answers[i] === k + 1}
                      onChange={() => {
                        const next = [...answers];
                        next[i] = k + 1;
                        setAnswers(next);
                      }}
                    />
                    <div className="font-bold text-base">{k + 1}</div>
                    <div className="text-[10px] mt-1">{lbl}</div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-primary" onClick={submit} disabled={loading || answers.some((v) => v < 1)}>
            {loading ? 'Enviando...' : 'Enviar encuesta SUS'}
          </button>
        </div>
      )}
    </div>
  );
}
