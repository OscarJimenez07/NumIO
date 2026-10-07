// Explicaciones compartidas por Trapecio, Simpson 1/3 y Simpson 3/8.
import { num, paren, redondear, rejilla } from '../../common/texto';

interface Nodo {
  i: number;
  n: number;
  a: number;
  b: number;
  h: number;
  x: number;
  y: number;
  /** Peso del nodo y por qué lo tiene (p. ej. «es un nodo impar»). */
  peso?: { valor: number; razon: string };
  /** La función, para mostrar f(x_i) con el valor reemplazado. */
  f?: { sustituirLatex(x: number): string };
}

export function explicarNodo({ i, n, a, b, h, x, y, peso, f }: Nodo): { explanation: string; latex: string } {
  const donde =
    i === 0
      ? `El primer nodo es el extremo izquierdo: x_0 = a = ${num(a)}.`
      : i === n
        ? `El último nodo es el extremo derecho: x_${i} = b = ${num(b)}.`
        : `Desde a = ${num(a)} se avanza${i === 1 ? ' 1 paso' : `n ${i} pasos`} de ancho h = ${num(h)}, así que x_${i} = ${num(x)}.`;
  const pesoTxt = peso ? ` Entra en la suma multiplicado por ${peso.valor} porque ${peso.razon}.` : '';
  return {
    explanation: `${donde} Ahí la función vale f(x_${i}) = ${num(y)}.${pesoTxt}`,
    latex: rejilla([
      [
        [`x_{${i}}`, `a + ${i}h = ${redondear(a)} + ${i}(${redondear(h)}) = ${redondear(x)}`],
        [`f(x_{${i}})`, `${f ? `${f.sustituirLatex(x)} = ` : ''}${redondear(y)}`],
      ],
      ...(peso ? [[[`w_{${i}}`, `${peso.valor} \\;\\text{porque ${peso.razon}}`] as [string, string]]] : []),
    ]),
  };
}

/** «w·f» de cada nodo para la sustitución en LaTeX: 0 + 4(0.0625) + 2(0.25) + ... */
export function desgloseLatex(ys: number[], peso: (i: number) => number): string {
  return ys
    .map((y, i) => {
      const w = peso(i);
      const termino = w === 1 ? paren(y) : `${w}(${redondear(y)})`;
      return i === 0 ? String(redondear(y)) : termino;
    })
    .join(' + ');
}
