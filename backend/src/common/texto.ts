// Formato de números para las explicaciones que lee el estudiante.
// Las explicaciones son texto plano (el frontend convierte x_1 en x₁), así que
// aquí solo se redondea y se usa el signo menos tipográfico «−».

export function redondear(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}

/** Número listo para una frase: 6 decimales como máximo y «−» en vez de «-». */
export function num(x: number): string {
  return String(redondear(x)).replace('-', '−');
}

/** Número para LaTeX que va después de un + o un −: 1 - (-2), no 1 - -2. */
export function paren(x: number): string {
  const r = redondear(x);
  return r < 0 ? `(${r})` : String(r);
}

/**
 * Rejilla de cuentas en LaTeX: cada renglón puede llevar varias igualdades
 * lado a lado. Cada igualdad es [lado izquierdo, resto].
 *   [[['a', '1'], ['b', '2']], [['c', '\\frac{1+2}{2} = 1.5']]]
 *   ->     a = 1      b = 2
 *        c = (1+2)/2 = 1.5
 * Cada renglón se centra por su cuenta: si se alinearan todos en columnas,
 * una cuenta larga ensancharía la columna y empujaría las demás fuera de la
 * pantalla.
 */
export function rejilla(filas: Array<Array<[string, string]>>): string {
  // Un lado derecho vacío deja la expresión sola, sin «=» (para conclusiones).
  const lineas = filas.map((fila) => fila.map(([izq, der]) => (der ? `${izq} = ${der}` : izq)).join('\\qquad\\quad '));
  return `\\begin{gathered}${lineas.join(' \\\\[8pt] ')}\\end{gathered}`;
}

function agrupar<T>(items: T[], porFila: number): T[][] {
  const filas: T[][] = [];
  for (let k = 0; k < items.length; k += porFila) filas.push(items.slice(k, k + porFila));
  return filas;
}

/** Agrupa igualdades de a dos por renglón, para usar el ancho disponible. */
export function pares<T>(items: T[]): T[][] {
  return agrupar(items, 2);
}

/** De a tres por renglón, para cuentas cortas (penalizaciones, potenciales). */
export function trios<T>(items: T[]): T[][] {
  return agrupar(items, 3);
}

/** Intervalo [a, b] para una frase. */
export function intervalo(a: number, b: number): string {
  return `[${num(a)}, ${num(b)}]`;
}
