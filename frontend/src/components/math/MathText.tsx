import { Fragment, type ReactNode } from 'react';

// Muestra las explicaciones que llegan del backend como texto limpio:
//   x_0, x_{12}, L_{2}  ->  x₀, x₁₂, L₂ (subíndice real con <sub>)
//   1 - 2, (-1)         ->  1 − 2, (−1) (signo menos tipográfico)
// Así no se ven guiones bajos ni llaves de LaTeX en medio de una frase.

const SUBINDICE = /([A-Za-z])_(?:\{([^}]+)\}|([A-Za-z0-9]+))/g;

function limpiarSignos(t: string): string {
  return t
    .replace(/ - /g, ' − ')
    .replace(/(^|[\s(=,\[])-(?=[\d.])/g, '$1−');
}

export function MathText({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  const limpio = limpiarSignos(text);
  const partes: ReactNode[] = [];
  let ultimo = 0;
  for (const m of limpio.matchAll(SUBINDICE)) {
    const i = m.index ?? 0;
    partes.push(limpio.slice(ultimo, i) + m[1]);
    partes.push(<sub key={i}>{m[2] ?? m[3]}</sub>);
    ultimo = i + m[0].length;
  }
  partes.push(limpio.slice(ultimo));
  return (
    <span className={className}>
      {partes.map((p, k) => (
        <Fragment key={k}>{p}</Fragment>
      ))}
    </span>
  );
}
