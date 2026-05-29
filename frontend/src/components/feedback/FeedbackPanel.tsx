interface FeedbackItem {
  stepIndex: number;
  field: string;
  expected: any;
  got: any;
  message: string;
  severity: 'error' | 'warning';
}

interface Props {
  isCorrect: boolean;
  feedback: FeedbackItem[];
  matchedSteps: number;
  totalSteps: number;
}

export function FeedbackPanel({ isCorrect, feedback, matchedSteps, totalSteps }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800">Retroalimentación</h3>
        <span
          className={`text-sm px-2 py-1 rounded ${
            isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}
        >
          {isCorrect ? '✓ Correcto' : '✗ Hay errores'}
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-3">
        Pasos correctos: <strong>{matchedSteps}</strong> / {totalSteps}
      </p>
      {feedback.length === 0 ? (
        <p className="text-sm text-slate-500">No hay observaciones. ¡Muy bien!</p>
      ) : (
        <ul className="space-y-2">
          {feedback.map((f, i) => (
            <li
              key={i}
              className={`text-sm rounded p-2 border-l-4 ${
                f.severity === 'error'
                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                  : 'border-amber-400 bg-amber-50 text-amber-900'
              }`}
            >
              <strong>Iteración {f.stepIndex + 1} · {f.field}:</strong> {f.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
