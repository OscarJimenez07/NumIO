// Traduce las claves internas que devuelve el backend en `step.state`
// (xNext, dfx, fc, ...) a su notación matemática (LaTeX) y explica de dónde
// sale cada valor. Así la tabla muestra x_{n+1} en vez de xNext, y la leyenda
// debajo indica la fórmula con la que se calculó.

export type MethodKey = 'bisection' | 'newton-raphson' | 'lagrange' | 'newton-divided' | 'integration';

export interface ColumnLabel {
  /** Encabezado corto en LaTeX. */
  tex: string;
  /** Qué representa el valor, en palabras. */
  desc: string;
  /** Fórmula de la que proviene (LaTeX), si aplica. */
  formula?: string;
}

const COMMON: Record<string, ColumnLabel> = {
  xEval: { tex: 'x', desc: 'Punto donde se evalúa el polinomio' },
  P: { tex: 'P(x)', desc: 'Valor del polinomio interpolante en x' },
};

const BY_METHOD: Record<MethodKey, Record<string, ColumnLabel>> = {
  bisection: {
    a: { tex: 'a', desc: 'Extremo izquierdo del intervalo' },
    b: { tex: 'b', desc: 'Extremo derecho del intervalo' },
    c: { tex: 'c', desc: 'Punto medio del intervalo', formula: 'c = \\frac{a+b}{2}' },
    fa: { tex: 'f(a)', desc: 'Función evaluada en a' },
    fb: { tex: 'f(b)', desc: 'Función evaluada en b' },
    fc: { tex: 'f(c)', desc: 'Función evaluada en c; su signo decide qué mitad se conserva' },
    error: {
      tex: 'E',
      desc: 'Error: en la 1.ª iteración |b − a|/2, luego la distancia entre puntos medios consecutivos',
      formula: 'E_i = |c_i - c_{i-1}|',
    },
  },
  'newton-raphson': {
    x: { tex: 'x_n', desc: 'Aproximación actual' },
    fx: { tex: 'f(x_n)', desc: 'Función evaluada en la aproximación actual' },
    dfx: { tex: "f'(x_n)", desc: 'Derivada evaluada en la aproximación actual' },
    xNext: { tex: 'x_{n+1}', desc: 'Nueva aproximación', formula: "x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}" },
    error: { tex: 'E', desc: 'Cambio entre dos aproximaciones consecutivas', formula: 'E = |x_{n+1} - x_n|' },
  },
  lagrange: {
    i: { tex: 'i', desc: 'Índice del punto' },
    xi: { tex: 'x_i', desc: 'Abscisa del punto i' },
    yi: { tex: 'y_i', desc: 'Ordenada del punto i' },
    denominator: {
      tex: '\\text{Den. } L_i',
      desc: 'Denominador de la base L_i(x)',
      formula: '\\prod_{j \\ne i}(x_i - x_j)',
    },
    sumaPesos: { tex: '\\textstyle\\sum L_i', desc: 'Suma de las bases; siempre da 1 (comprobación)', formula: '\\sum_i L_i(x) = 1' },
    P: { tex: 'P(x)', desc: 'Valor del polinomio en x', formula: 'P(x) = \\sum_i y_i\\,L_i(x)' },
  },
  'newton-divided': {
    order: { tex: 'k', desc: 'Orden de la diferencia dividida' },
    P: { tex: 'P(x)', desc: 'Valor del polinomio en x: suma de todos los términos' },
  },
  integration: {
    i: { tex: 'i', desc: 'Índice del nodo' },
    x: { tex: 'x_i', desc: 'Nodo de la partición', formula: 'x_i = a + i\\,h' },
    y: { tex: 'f(x_i)', desc: 'Función evaluada en el nodo' },
    weight: { tex: 'w_i', desc: 'Peso del nodo en la fórmula (coeficiente que multiplica a f(xᵢ))' },
    h: { tex: 'h', desc: 'Ancho de cada subintervalo', formula: 'h = \\frac{b-a}{n}' },
    sumaInterior: { tex: '\\textstyle\\sum f(x_i)', desc: 'Suma de los nodos interiores', formula: '\\sum_{i=1}^{n-1} f(x_i)' },
    sum: { tex: 'S', desc: 'Suma ponderada de todas las evaluaciones', formula: 'S = \\sum_i w_i\\,f(x_i)' },
    integral: { tex: 'I', desc: 'Valor aproximado de la integral (h/2·S en trapecio, h/3·S en Simpson 1/3, 3h/8·S en Simpson 3/8)', formula: 'I \\approx \\int_a^b f(x)\\,dx' },
  },
};

/** Claves con índice al final: L0, L1, ... (Lagrange) y termino0, ... (Newton). */
function dynamicLabel(key: string): ColumnLabel | null {
  const l = /^L(\d+)$/.exec(key);
  if (l) {
    return {
      tex: `L_{${l[1]}}(x)`,
      desc: `Base de Lagrange del punto ${l[1]} evaluada en x`,
      formula: `L_{${l[1]}}(x) = \\prod_{j \\ne ${l[1]}} \\frac{x - x_j}{x_{${l[1]}} - x_j}`,
    };
  }
  const t = /^termino(\d+)$/.exec(key);
  if (t) {
    const k = Number(t[1]);
    const coef = k === 0 ? 'f[x_0]' : `f[x_0,\\dots,x_{${k}}]`;
    const factores = Array.from({ length: k }, (_, j) => `(x - x_{${j}})`).join('');
    return { tex: `T_{${k}}`, desc: `Término ${k} del polinomio de Newton`, formula: `T_{${k}} = ${coef}${factores}` };
  }
  return null;
}

export function columnLabel(method: MethodKey | undefined, key: string): ColumnLabel {
  return (method && BY_METHOD[method][key]) || COMMON[key] || dynamicLabel(key) || { tex: `\\text{${key}}`, desc: '' };
}
