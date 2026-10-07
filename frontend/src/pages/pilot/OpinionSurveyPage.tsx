import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

export interface Cuestionario {
  dimensiones: { id: string; nombre: string }[];
  items: { id: string; dimension: string; texto: string }[];
  escala: string[];
  recomendacion: string;
  frecuencias: { id: string; texto: string }[];
  modulos: { id: string; texto: string }[];
  abiertas: { mostUseful: string; improvements: string };
  /** Las 10 afirmaciones de la escala SUS. */
  sus: string[];
}

function mensaje(err: any, porDefecto: string): string {
  const m = err?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? porDefecto;
}

/**
 * Encuesta de opinión: percepción de utilidad, usabilidad (SUS) y
 * satisfacción con la plataforma. Se responde una sola vez: las respuestas
 * quedan fijas para que los resultados del piloto no cambien después.
 */
export function OpinionSurveyPage() {
  const [cuestionario, setCuestionario] = useState<Cuestionario | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<number | null>(null);
  const [frequency, setFrequency] = useState('');
  const [modules, setModules] = useState<string[]>([]);
  const [mostUseful, setMostUseful] = useState('');
  const [improvements, setImprovements] = useState('');
  const [sus, setSus] = useState<number[]>(Array(10).fill(0));
  // Respuesta ya registrada: se muestra el agradecimiento en lugar del formulario.
  const [completada, setCompletada] = useState<{ fecha: string; susScore: number | null } | null>(null);
  // Respuesta enviada antes de integrar la SUS: puede completarse una vez.
  const [completarSus, setCompletarSus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/opinion/cuestionario'), api.get('/opinion/mia')])
      .then(([c, mia]) => {
        setCuestionario(c.data);
        if (mia.data) {
          setAnswers(mia.data.answers ?? {});
          setRecommendation(mia.data.recommendation);
          setFrequency(mia.data.frequency);
          setModules(mia.data.modules ?? []);
          setMostUseful(mia.data.mostUseful ?? '');
          setImprovements(mia.data.improvements ?? '');
          if (mia.data.susScore !== null && mia.data.susScore !== undefined) {
            setCompletada({ fecha: mia.data.createdAt, susScore: mia.data.susScore });
          } else {
            setCompletarSus(true);
          }
        }
      })
      .catch((err) => setError(mensaje(err, 'No se pudo cargar la encuesta.')))
      .finally(() => setCargando(false));
  }, []);

  const faltan = useMemo(() => {
    if (!cuestionario) return 0;
    return (
      cuestionario.items.filter((i) => !answers[i.id]).length +
      sus.filter((v) => v < 1).length +
      (recommendation === null ? 1 : 0) +
      (frequency ? 0 : 1)
    );
  }, [cuestionario, answers, sus, recommendation, frequency]);

  const enviar = async () => {
    if (!window.confirm('Una vez enviada, la encuesta no se puede modificar. ¿Enviar tus respuestas?')) return;
    setEnviando(true);
    setError(null);
    try {
      const { data } = await api.post('/opinion', { answers, susAnswers: sus, recommendation, frequency, modules, mostUseful, improvements });
      setCompletada({ fecha: new Date().toISOString(), susScore: data?.susScore ?? null });
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(mensaje(err, 'No se pudo guardar la encuesta.'));
    } finally {
      setEnviando(false);
    }
  };

  const alternarModulo = (id: string) =>
    setModules((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  if (cargando) return <p className="text-sm text-slate-500">Cargando...</p>;
  if (!cuestionario) return <p className="text-sm text-rose-700">{error}</p>;

  let numero = 0;

  return (
    <div>
      <PageHeader
        title="Encuesta de opinión sobre NumIO"
        category="Validación pedagógica"
        description="Cuéntanos qué tan útil te resultó la plataforma y qué tan fácil fue usarla. Toma unos 8 minutos. El docente solo ve resultados agregados: tu nombre no aparece junto a tus respuestas."
      />

      {completada ? (
        <div className="card border-emerald-300 bg-emerald-50">
          <h3 className="text-lg font-semibold text-emerald-900">¡Gracias por responder!</h3>
          <p className="text-sm text-emerald-900">
            Respondiste esta encuesta el {new Date(completada.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.
            Tus respuestas quedaron registradas y no se pueden modificar.
          </p>
          {completada.susScore !== null && (
            <p className="mt-1 text-sm text-emerald-900">
              Tu puntuación de usabilidad (SUS): <strong>{completada.susScore}</strong> / 100.
            </p>
          )}
        </div>
      ) : (
      <>
      {completarSus && (
        <p className="mb-4 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          Tu respuesta anterior no incluía la sección de usabilidad (SUS), que se agregó después. Abajo están tus
          respuestas: completa esa sección y envía. Después de este envío la encuesta quedará cerrada.
        </p>
      )}
      <p className="mb-4 rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700">
        Revisa bien tus respuestas: la encuesta se envía <strong>una sola vez</strong> y después no se puede modificar.
      </p>

      <div className="space-y-6">
        {cuestionario.dimensiones.map((d) => (
          <section key={d.id} className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">{d.nombre}</h2>
            {cuestionario.items
              .filter((i) => i.dimension === d.id)
              .map((item) => {
                numero++;
                return (
                  <div key={item.id} className="card">
                    <p className="mb-3 text-sm font-medium">
                      {numero}. {item.texto}
                    </p>
                    <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={item.texto}>
                      {cuestionario.escala.map((etiqueta, k) => {
                        const valor = k + 1;
                        const activo = answers[item.id] === valor;
                        return (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={activo}
                            onClick={() => setAnswers((a) => ({ ...a, [item.id]: valor }))}
                            className={`rounded border p-2 text-center text-xs ${
                              activo
                                ? 'border-brand-600 bg-brand-100 font-medium text-brand-900'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-base font-bold">{valor}</div>
                            <div className="mt-1 text-[10px] leading-tight">{etiqueta}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Usabilidad del sistema (escala SUS)</h2>
          <p className="text-sm text-slate-600">
            Estas diez afirmaciones forman un cuestionario estándar de usabilidad. Algunas están redactadas en
            negativo a propósito: responde cada una según tu experiencia.
          </p>
          {cuestionario.sus.map((texto, i) => {
            numero++;
            return (
              <div key={i} className="card">
                <p className="mb-3 text-sm font-medium">{numero}. {texto}</p>
                <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={texto}>
                  {cuestionario.escala.map((etiqueta, k) => {
                    const valor = k + 1;
                    const activo = sus[i] === valor;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => setSus((s) => s.map((v, j) => (j === i ? valor : v)))}
                        className={`rounded border p-2 text-center text-xs ${
                          activo
                            ? 'border-brand-600 bg-brand-100 font-medium text-brand-900'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-base font-bold">{valor}</div>
                        <div className="mt-1 text-[10px] leading-tight">{etiqueta}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Uso de la plataforma</h2>

          <div className="card">
            <p className="mb-3 text-sm font-medium">{++numero}. {cuestionario.recomendacion}</p>
            <div className="grid grid-cols-6 gap-1 sm:grid-cols-11" role="radiogroup" aria-label={cuestionario.recomendacion}>
              {Array.from({ length: 11 }, (_, k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={recommendation === k}
                  onClick={() => setRecommendation(k)}
                  className={`rounded border py-2 text-center text-sm font-bold ${
                    recommendation === k
                      ? 'border-brand-600 bg-brand-100 text-brand-900'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Nada probable</span>
              <span>Muy probable</span>
            </div>
          </div>

          <div className="card">
            <p className="mb-3 text-sm font-medium">{++numero}. ¿Con qué frecuencia usaste NumIO durante el periodo de prueba?</p>
            <div className="space-y-1">
              {cuestionario.frecuencias.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-slate-50">
                  <input type="radio" name="frecuencia" checked={frequency === f.id} onChange={() => setFrequency(f.id)} />
                  <span className="text-sm">{f.texto}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="mb-3 text-sm font-medium">
              {++numero}. ¿Qué módulos te resultaron más útiles? <span className="font-normal text-slate-500">(puedes marcar varios)</span>
            </p>
            <div className="grid gap-1 sm:grid-cols-2">
              {cuestionario.modulos.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-slate-50">
                  <input type="checkbox" checked={modules.includes(m.id)} onChange={() => alternarModulo(m.id)} />
                  <span className="text-sm">{m.texto}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label" htmlFor="mas-util">{++numero}. {cuestionario.abiertas.mostUseful}</label>
              <textarea id="mas-util" className="input min-h-[80px]" maxLength={1500} value={mostUseful} onChange={(e) => setMostUseful(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="mejoras">{++numero}. {cuestionario.abiertas.improvements}</label>
              <textarea id="mejoras" className="input min-h-[80px]" maxLength={1500} value={improvements} onChange={(e) => setImprovements(e.target.value)} />
            </div>
          </div>
        </section>

        {error && <p className="rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={enviar} disabled={enviando || faltan > 0}>
            {enviando ? 'Enviando...' : 'Enviar encuesta'}
          </button>
          {faltan > 0 && (
            <span className="text-sm text-slate-600">
              Falta{faltan === 1 ? '' : 'n'} {faltan} pregunta{faltan === 1 ? '' : 's'} obligatoria{faltan === 1 ? '' : 's'}.
            </span>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
