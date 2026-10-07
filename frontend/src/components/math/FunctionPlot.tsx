import { useRef } from 'react';
import Plot from 'react-plotly.js';
import { sample } from '@/lib/math';

interface Mark {
  x: number;
  y?: number;
  label?: string;
}

interface Props {
  fn?: string;
  xRange: [number, number];
  marks?: Mark[];
  highlightIndex?: number;
  height?: number;
  title?: string;
  fillIntegralFrom?: [number, number]; // sombrear área
}

export function FunctionPlot({
  fn,
  xRange,
  marks = [],
  highlightIndex,
  height = 320,
  title,
  fillIntegralFrom,
}: Props) {
  // Mientras se edita un límite el rango puede quedar incompleto (campo vacío):
  // se sigue dibujando con el último rango válido en lugar de dejar la gráfica en blanco.
  const ultimoRango = useRef<[number, number]>([-1, 1]);
  if (Number.isFinite(xRange[0]) && Number.isFinite(xRange[1]) && xRange[0] < xRange[1]) {
    ultimoRango.current = xRange;
  }
  xRange = ultimoRango.current;
  const traces: any[] = [];

  if (fn) {
    const { xs, ys } = sample(fn, xRange[0], xRange[1], 300);
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: xs,
      y: ys,
      name: `f(x) = ${fn}`,
      line: { color: '#636F0B', width: 2.2 },
    });
    if (fillIntegralFrom) {
      const { xs: xf, ys: yf } = sample(fn, fillIntegralFrom[0], fillIntegralFrom[1], 300);
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: xf,
        y: yf,
        fill: 'tozeroy',
        fillcolor: 'rgba(193,214,49,0.32)',
        line: { color: 'transparent' },
        name: 'Área',
        hoverinfo: 'skip',
      });
    }
    // eje x
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: [xRange[0], xRange[1]],
      y: [0, 0],
      line: { color: '#A8AC9A', width: 1 },
      hoverinfo: 'skip',
      showlegend: false,
    });
  }

  if (marks.length > 0) {
    traces.push({
      type: 'scatter',
      mode: 'markers+text',
      x: marks.map((m) => m.x),
      y: marks.map((m) => m.y ?? 0),
      text: marks.map((m) => m.label ?? ''),
      textposition: 'top center',
      marker: {
        color: marks.map((_, i) => (i === highlightIndex ? '#C2410C' : '#4B5507')),
        size: marks.map((_, i) => (i === highlightIndex ? 12 : 7)),
      },
      name: 'Iteraciones',
    });
  }

  return (
    <Plot
      data={traces}
      layout={{
        title: title ? { text: title } : undefined,
        autosize: true,
        height,
        margin: { l: 40, r: 20, t: title ? 40 : 20, b: 40 },
        xaxis: { zeroline: false, gridcolor: '#E8EAE1' },
        yaxis: { zeroline: false, gridcolor: '#E8EAE1' },
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#ffffff',
        legend: { orientation: 'h' },
      }}
      style={{ width: '100%' }}
      useResizeHandler
      config={{ displaylogo: false, responsive: true }}
    />
  );
}
