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
  const traces: any[] = [];

  if (fn) {
    const { xs, ys } = sample(fn, xRange[0], xRange[1], 300);
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: xs,
      y: ys,
      name: `f(x) = ${fn}`,
      line: { color: '#2563eb', width: 2 },
    });
    if (fillIntegralFrom) {
      const { xs: xf, ys: yf } = sample(fn, fillIntegralFrom[0], fillIntegralFrom[1], 300);
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: xf,
        y: yf,
        fill: 'tozeroy',
        fillcolor: 'rgba(59,130,246,0.15)',
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
      line: { color: '#94a3b8', width: 1 },
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
        color: marks.map((_, i) => (i === highlightIndex ? '#ef4444' : '#1e40af')),
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
        xaxis: { zeroline: false, gridcolor: '#e2e8f0' },
        yaxis: { zeroline: false, gridcolor: '#e2e8f0' },
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
