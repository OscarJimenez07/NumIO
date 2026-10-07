import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api';

interface Item {
  id: string;
  dimension: string;
  texto: string;
  promedio: number;
  desviacion: number;
  distribucion: number[];
  acuerdo: number;
}
interface Resultados {
  n: number;
  general: { promedio: number; acuerdo: number };
  dimensiones: { id: string; nombre: string; promedio: number; acuerdo: number }[];
  items: Item[];
  recomendacion: { promedio: number; distribucion: number[]; promotores: number; pasivos: number; detractores: number; nps: number };
  sus: {
    n: number;
    promedio: number;
    desviacion: number;
    minimo: number;
    maximo: number;
    sobrePromedio: number;
    items: { numero: number; texto: string; positivo: boolean; promedio: number }[];
  };
  frecuencia: { id: string; texto: string; cantidad: number }[];
  modulos: { id: string; texto: string; cantidad: number }[];
  comentarios: { mostUseful: string[]; improvements: string[] };
  filas: Record<string, string | number>[];
}

// Escala divergente: desacuerdo en rojo, neutral en gris, acuerdo en azul.
// La luminosidad baja hacia los extremos en cada brazo.
const ESCALA = [
  { etiqueta: 'Totalmente en desacuerdo', color: '#c93b3a' },
  { etiqueta: 'En desacuerdo', color: '#ef9a99' },
  { etiqueta: 'Neutral', color: '#c9c8c3' },
  { etiqueta: 'De acuerdo', color: '#86b6ef' },
  { etiqueta: 'Totalmente de acuerdo', color: '#256abf' },
];
const AZUL = '#256abf';

const pct = (parte: number, total: number) => (total ? (parte / total) * 100 : 0);
const fmt = (x: number) => x.toLocaleString('es-CO', { maximumFractionDigits: 1 });
/** Promedios siempre con un decimal, para que 4 y 3,9 se lean en la misma escala. */
const prom = (x: number) => x.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Resultados de la encuesta de opinión, agregados y sin datos personales:
 * indicadores generales, promedio por dimensión, distribución de cada
 * afirmación, recomendación, frecuencia de uso, módulos y comentarios.
 */
export function OpinionResultsPage() {
  const [data, setData] = useState<Resultados | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verTabla, setVerTabla] = useState(false);

  useEffect(() => {
    api
      .get<Resultados>('/opinion/resultados')
      .then(({ data }) => setData(data))
      .catch(() => setError('No se pudieron cargar los resultados.'));
  }, []);

  const exportar = () => {
    if (!data || data.filas.length === 0) return;
    const cab = Object.keys(data.filas[0]);
    const csv = [cab.join(','), ...data.filas.map((f) => cab.map((h) => JSON.stringify(f[h] ?? '')).join(','))].join('\n');
    // El BOM hace que Excel reconozca las tildes.
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encuesta-opinion.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <p className="text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Cargando...</p>;

  const cabecera = (
    <PageHeader
      title="Resultados de la encuesta de opinión"
      category="Panel docente"
      description="Percepción de utilidad, usabilidad (SUS) y satisfacción de los estudiantes con NumIO. Los resultados son anónimos: no se muestra quién respondió qué."
    />
  );

  if (data.n === 0) {
    return (
      <div>
        {cabecera}
        <div className="card text-sm text-slate-600">
          Aún no hay respuestas. Los estudiantes la encuentran en el menú <strong>Validación → Encuesta de opinión</strong>.
        </div>
      </div>
    );
  }

  const maxModulo = Math.max(1, ...data.modulos.map((m) => m.cantidad));
  const maxRec = Math.max(1, ...data.recomendacion.distribucion);

  return (
    <div>
      {cabecera}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Respuestas" valor={String(data.n)} nota="estudiantes" />
        <Indicador etiqueta="Acuerdo general" valor={`${fmt(data.general.acuerdo)} %`} nota="respuestas 4 o 5 en todas las afirmaciones" />
        <Indicador etiqueta="Promedio general" valor={`${prom(data.general.promedio)} / 5`} nota="escala de 1 a 5" />
        <Indicador
          etiqueta="Recomendación"
          valor={`${prom(data.recomendacion.promedio)} / 10`}
          nota={`índice neto ${data.recomendacion.nps > 0 ? '+' : ''}${data.recomendacion.nps}`}
        />
      </div>

      <div className="card mb-6">
        <h3 className="mb-1 font-semibold">Promedio por dimensión</h3>
        <p className="mb-4 text-sm text-slate-600">Escala de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo).</p>
        <div className="space-y-3">
          {data.dimensiones.map((d) => (
            <BarraHorizontal
              key={d.id}
              etiqueta={d.nombre}
              ancho={pct(d.promedio, 5)}
              valor={`${prom(d.promedio)} · ${fmt(d.acuerdo)} % de acuerdo`}
              titulo={`${d.nombre}: promedio ${prom(d.promedio)} de 5, ${fmt(d.acuerdo)} % de acuerdo`}
            />
          ))}
        </div>
      </div>

      <div className="card mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Respuestas por afirmación</h3>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => setVerTabla((v) => !v)}>
              {verTabla ? 'Ver gráfica' : 'Ver tabla'}
            </button>
            <button className="btn-secondary text-xs" onClick={exportar}>Exportar CSV</button>
          </div>
        </div>
        {verTabla ? <TablaItems items={data.items} n={data.n} /> : <Divergente items={data.items} />}
      </div>

      <Sus sus={data.sus} />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-1 font-semibold">¿Recomendarías NumIO a un compañero?</h3>
          <p className="mb-4 text-sm text-slate-600">
            Promotores (9–10): {data.recomendacion.promotores} · Pasivos (7–8): {data.recomendacion.pasivos} ·
            Detractores (0–6): {data.recomendacion.detractores}. Índice neto = % promotores − % detractores ={' '}
            <strong>{data.recomendacion.nps > 0 ? '+' : ''}{data.recomendacion.nps}</strong>.
          </p>
          <div className="flex h-40 items-end gap-1" role="img" aria-label="Distribución de la recomendación de 0 a 10">
            {data.recomendacion.distribucion.map((c, k) => (
              <div key={k} className="flex h-full flex-1 flex-col items-center gap-1" title={`${k}: ${c} respuesta${c === 1 ? '' : 's'}`}>
                {/* La columna tiene altura fija, así el porcentaje de la barra tiene a qué referirse. */}
                <div className="flex w-full flex-1 flex-col items-center justify-end">
                  <span className="mb-1 text-xs text-slate-700">{c || ''}</span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${pct(c, maxRec) * 0.8}%`,
                      minHeight: c ? 4 : 0,
                      background: k <= 6 ? ESCALA[1].color : k <= 8 ? ESCALA[2].color : ESCALA[4].color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700">{k}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold">Frecuencia de uso</h3>
          <div className="space-y-3">
            {data.frecuencia.map((f) => (
              <BarraHorizontal
                key={f.id}
                etiqueta={f.texto}
                ancho={pct(f.cantidad, data.n)}
                valor={`${f.cantidad} (${fmt(pct(f.cantidad, data.n))} %)`}
                titulo={`${f.texto}: ${f.cantidad} de ${data.n}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="mb-1 font-semibold">Módulos más útiles</h3>
        <p className="mb-4 text-sm text-slate-600">Cada estudiante podía marcar varios; el porcentaje es sobre el total de respuestas.</p>
        <div className="space-y-2">
          {[...data.modulos]
            .sort((a, b) => b.cantidad - a.cantidad)
            .map((m) => (
              <BarraHorizontal
                key={m.id}
                etiqueta={m.texto}
                ancho={pct(m.cantidad, maxModulo)}
                valor={`${m.cantidad} (${fmt(pct(m.cantidad, data.n))} %)`}
                titulo={`${m.texto}: ${m.cantidad} de ${data.n} estudiantes`}
              />
            ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Comentarios titulo="Lo que más les sirvió" lista={data.comentarios.mostUseful} />
        <Comentarios titulo="Lo que mejorarían" lista={data.comentarios.improvements} />
      </div>
    </div>
  );
}

/** Lectura habitual del puntaje SUS (Bangor, Kortum y Miller, 2009). */
function interpretarSus(p: number): string {
  if (p > 80.3) return 'excelente';
  if (p > 68) return 'buena, por encima del promedio';
  if (p >= 51) return 'aceptable, por debajo del promedio';
  return 'deficiente';
}

function Sus({ sus }: { sus: Resultados['sus'] }) {
  if (sus.n === 0) return null;
  return (
    <div className="card mb-6">
      <h3 className="mb-1 font-semibold">Usabilidad del sistema (escala SUS)</h3>
      <p className="mb-4 text-sm text-slate-600">
        Puntaje estandarizado de 0 a 100; 68 es el promedio de referencia (Bangor, Kortum y Miller).
      </p>
      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div>
          <p className="text-4xl font-bold text-slate-900">{prom(sus.promedio)} <span className="text-xl font-semibold text-slate-600">/ 100</span></p>
          <p className="mt-1 text-sm text-slate-700">Usabilidad {interpretarSus(sus.promedio)}.</p>
          {/* Escala 0-100 con la marca del promedio de referencia. */}
          <div className="relative mt-4 h-3 rounded bg-slate-100" title={`Promedio SUS: ${prom(sus.promedio)}`}>
            <div className="h-3 rounded" style={{ width: `${sus.promedio}%`, background: AZUL }} />
            <div className="absolute -top-1 h-5 w-0.5 bg-slate-700" style={{ left: '68%' }} aria-hidden="true" />
          </div>
          <div className="relative mt-1 h-4 text-[11px] text-slate-600">
            <span className="absolute left-0">0</span>
            <span className="absolute -translate-x-1/2" style={{ left: '68%' }}>68</span>
            <span className="absolute right-0">100</span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-600">Respuestas</dt><dd className="font-mono">{sus.n}</dd>
            <dt className="text-slate-600">Desv. estándar</dt><dd className="font-mono">{prom(sus.desviacion)}</dd>
            <dt className="text-slate-600">Rango</dt><dd className="font-mono">{fmt(sus.minimo)} – {fmt(sus.maximo)}</dd>
            <dt className="text-slate-600">Sobre 68</dt><dd className="font-mono">{fmt(sus.sobrePromedio)} %</dd>
          </dl>
        </div>
        <div className="overflow-x-auto">
          <table className="table-clean">
            <thead>
              <tr><th>#</th><th>Afirmación</th><th>Promedio (1–5)</th><th>Mejor si es</th></tr>
            </thead>
            <tbody>
              {sus.items.map((it) => (
                <tr key={it.numero}>
                  <td className="font-mono">{it.numero}</td>
                  <td>{it.texto}</td>
                  <td className="font-mono">{prom(it.promedio)}</td>
                  <td className="text-xs text-slate-600">{it.positivo ? 'alto' : 'bajo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">Las afirmaciones pares están en negativo: en ellas un promedio bajo es lo deseable.</p>
        </div>
      </div>
    </div>
  );
}

function Indicador({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota: string }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-600">{etiqueta}</p>
      <p className="text-3xl font-bold text-slate-900">{valor}</p>
      <p className="text-xs text-slate-500">{nota}</p>
    </div>
  );
}

function BarraHorizontal({ etiqueta, ancho, valor, titulo }: { etiqueta: string; ancho: number; valor: string; titulo: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,40%)_1fr] items-center gap-3" title={titulo}>
      <span className="text-sm leading-tight text-slate-700">{etiqueta}</span>
      <div className="flex items-center gap-2">
        <div className="h-4 flex-1 rounded bg-slate-100">
          <div className="h-4 rounded" style={{ width: `${ancho}%`, background: AZUL }} />
        </div>
        <span className="w-32 shrink-0 text-xs text-slate-700">{valor}</span>
      </div>
    </div>
  );
}

/**
 * Barra apilada divergente centrada en el neutral: el desacuerdo crece hacia
 * la izquierda y el acuerdo hacia la derecha, de modo que se compara de un
 * vistazo hacia dónde se inclina cada afirmación.
 */
function Divergente({ items }: { items: Item[] }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
        {ESCALA.map((e) => (
          <span key={e.etiqueta} className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: e.color }} />
            {e.etiqueta}
          </span>
        ))}
      </div>
      <div className="space-y-4">
        {items.map((it) => {
          const total = it.distribucion.reduce((a, b) => a + b, 0);
          const p = it.distribucion.map((c) => pct(c, total));
          const desacuerdo = p[0] + p[1];
          const segmento = (k: number, ancho: number) =>
            ancho > 0 && (
              <div
                key={k}
                className="flex h-5 items-center justify-center text-[10px] font-medium"
                style={{ width: `${ancho}%`, background: ESCALA[k].color, color: k === 0 || k === 4 ? '#ffffff' : '#0b0b0b' }}
                title={`${ESCALA[k].etiqueta}: ${it.distribucion[k]} (${fmt(p[k])} %)`}
              >
                {ancho >= 8 ? `${Math.round(p[k])}%` : ''}
              </div>
            );
          return (
            <div key={it.id}>
              <p className="mb-1 text-sm text-slate-800">
                <span className="font-mono text-xs text-slate-500">{it.id}</span> {it.texto}
              </p>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-right text-xs text-slate-600">{fmt(desacuerdo)} %</span>
                <div className="relative flex flex-1">
                  {/* mitad izquierda: desacuerdo + la mitad del neutral */}
                  <div className="flex w-1/2 justify-end gap-[2px] pr-px">
                    {segmento(0, p[0])}
                    {segmento(1, p[1])}
                    {p[2] > 0 && <div className="h-5 rounded-l-none" style={{ width: `${p[2] / 2}%`, background: ESCALA[2].color }} title={`Neutral: ${it.distribucion[2]} (${fmt(p[2])} %)`} />}
                  </div>
                  <div className="absolute inset-y-[-3px] left-1/2 w-px bg-slate-400" aria-hidden="true" />
                  <div className="flex w-1/2 gap-[2px] pl-px">
                    {p[2] > 0 && <div className="h-5" style={{ width: `${p[2] / 2}%`, background: ESCALA[2].color }} title={`Neutral: ${it.distribucion[2]} (${fmt(p[2])} %)`} />}
                    {segmento(3, p[3])}
                    {segmento(4, p[4])}
                  </div>
                </div>
                <span className="w-12 shrink-0 text-xs font-semibold text-slate-800">{fmt(it.acuerdo)} %</span>
                <span className="hidden w-16 shrink-0 text-xs text-slate-600 sm:inline">x̄ {prom(it.promedio)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        A la izquierda del eje, el porcentaje en desacuerdo (1–2); a la derecha, el de acuerdo (4–5); x̄ es el promedio de 1 a 5.
      </p>
    </div>
  );
}

function TablaItems({ items, n }: { items: Item[]; n: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-clean">
        <thead>
          <tr>
            <th>Afirmación</th>
            {[1, 2, 3, 4, 5].map((k) => <th key={k} className="text-center">{k}</th>)}
            <th>Promedio</th>
            <th>Desv. est.</th>
            <th>% acuerdo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="min-w-[16rem]"><span className="font-mono text-xs text-slate-500">{it.id}</span> {it.texto}</td>
              {it.distribucion.map((c, k) => <td key={k} className="text-center font-mono">{c}</td>)}
              <td className="font-mono">{prom(it.promedio)}</td>
              <td className="font-mono">{prom(it.desviacion)}</td>
              <td className="font-mono">{fmt(it.acuerdo)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">n = {n}. Columnas 1 a 5: número de estudiantes que eligió cada valor.</p>
    </div>
  );
}

function Comentarios({ titulo, lista }: { titulo: string; lista: string[] }) {
  return (
    <div className="card">
      <h3 className="mb-3 font-semibold">{titulo} <span className="font-normal text-slate-500">({lista.length})</span></h3>
      {lista.length === 0 ? (
        <p className="text-sm text-slate-500">Sin comentarios.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {lista.map((t, k) => (
            <li key={k} className="rounded border-l-4 border-slate-300 bg-slate-50 p-2 text-sm text-slate-800">{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
