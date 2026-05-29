import { create, all } from 'mathjs';

const math = create(all, { number: 'number' });

export function evalExpression(expr: string, x: number): number {
  const node = math.parse(expr);
  const compiled = node.compile();
  const v = compiled.evaluate({ x });
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error('Resultado no finito');
  }
  return v;
}

export function tryEval(expr: string, x: number): number | null {
  try {
    return evalExpression(expr, x);
  } catch {
    return null;
  }
}

export function expressionToLatex(expr: string): string {
  try {
    return math.parse(expr).toTex();
  } catch {
    return expr;
  }
}

export function sample(expr: string, xMin: number, xMax: number, n = 200): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= n; i++) {
    const x = xMin + (i / n) * (xMax - xMin);
    const y = tryEval(expr, x);
    if (y !== null && Number.isFinite(y) && Math.abs(y) < 1e8) {
      xs.push(x);
      ys.push(y);
    }
  }
  return { xs, ys };
}
