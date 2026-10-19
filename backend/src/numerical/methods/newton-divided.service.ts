import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../shared/step.types';
import { InterpolationInputDto } from '../dto/interpolation.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num as fmt, pares, paren, rejilla } from '../../common/texto';

@Injectable()
export class NewtonDividedService {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: InterpolationInputDto): SolveResult {
    const pts = input.points;
    if (!pts || pts.length < 2) {
      throw new BadRequestException('Se requieren al menos 2 puntos para interpolar.');
    }
    const xs = pts.map((p) => p.x);
    if (new Set(xs).size !== xs.length) {
      throw new BadRequestException('Los valores de x deben ser distintos.');
    }
    const n = pts.length;

    // Tabla de diferencias divididas
    const F: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) F[i][0] = pts[i].y;

    const steps: Step[] = [];

    for (let j = 1; j < n; j++) {
      for (let i = 0; i < n - j; i++) {
        F[i][j] = (F[i + 1][j - 1] - F[i][j - 1]) / (pts[i + j].x - pts[i].x);
      }

      // Se muestra la cuenta real de cada valor de la columna, con los números
      // concretos: la notación genérica con subíndices encadenados era ilegible.
      // Los negativos se envuelven en paréntesis: «− (−0.1438)» y no «− -0.1438».
      const xLejos = pts[j].x;
      const xCerca = pts[0].x;
      const columna = F.slice(0, n - j).map((row) => round(row[j]));

      steps.push({
        iteration: j,
        state: {
          order: j,
          column: columna as number[],
        },
        explanation:
          `Diferencias de orden ${j}: cada valor de la columna anterior se resta con el de abajo ` +
          `y se divide entre la distancia de sus x. Por ejemplo, el primero sale de restar ` +
          `${fmt(F[1][j - 1])} − ${parTxt(fmt(F[0][j - 1]))} y dividir entre ${fmt(xLejos)} − ${parTxt(fmt(xCerca))}: da ${fmt(F[0][j])}. ` +
          `La columna completa es ${columna.map(fmt).join('; ')}. ` +
          `Su primer valor, ${fmt(F[0][j])}, es el coeficiente número ${j} del polinomio.`,
        // La cuenta de cada valor de la columna (dos por renglón).
        latex: rejilla(
          pares(
            F.slice(0, n - j).map((_, i): [string, string] => [
              corchete(i, i + j),
              `\\frac{${round(F[i + 1][j - 1])} - ${paren(F[i][j - 1])}}{${round(pts[i + j].x)} - ${paren(pts[i].x)}} = ${round(F[i][j])}`,
            ]),
          ),
        ),
      });
    }

    // Coeficientes del polinomio: F[0][0], F[0][1], ..., F[0][n-1]
    const coeffs = F[0].slice(0, n).map((v) => round(v));

    let evalResult: number | null = null;
    if (input.evalAt !== undefined) {
      const xe = input.evalAt;
      evalResult = this.evaluate(pts, F, xe);

      // Se desarrolla término a término: cada coeficiente por el producto de
      // los (x - x_k) anteriores, que es la cuenta que se hace en el cuaderno.
      const terminos: string[] = [];
      const valores: number[] = [];
      let producto = 1;
      for (let k = 0; k < n; k++) {
        if (k > 0) producto *= xe - pts[k - 1].x;
        const coef = round(F[0][k]);
        valores.push(round(coef * producto));
        const coefTex = k === 0 ? String(coef) : coef < 0 ? `(${coef})` : String(coef);
        terminos.push(
          coefTex + Array.from({ length: k }, (_, m) => `(${round(xe)} - ${paren(pts[m].x)})`).join(''),
        );
      }
      const valoresTex = valores.map((v, k) => (k === 0 ? String(v) : paren(v))).join(' + ');

      steps.push({
        iteration: n,
        state: {
          xEval: xe,
          ...Object.fromEntries(valores.map((v, k) => [`termino${k}`, v])),
          P: round(evalResult),
        },
        explanation:
          `Se evalúa el polinomio en x = ${fmt(xe)}. Cada término es un coeficiente multiplicado por ` +
          `los factores (x − x_k) de los puntos anteriores: ` +
          valores.map((v, k) => `T_${k} = ${fmt(v)}`).join(', ') +
          `. Sumándolos: P(${fmt(xe)}) = ${fmt(evalResult)}.`,
        // Cada término T_k con su cuenta (dos por renglón) y luego la suma.
        latex: rejilla([
          ...pares(terminos.map((t, k): [string, string] => [`T_{${k}}`, k === 0 ? `${t}` : `${t} = ${valores[k]}`])),
          [[`P(${round(xe)})`, `${valores.map((_, k) => `T_{${k}}`).join(' + ')} = ${valoresTex} = ${round(evalResult)}`]],
        ]),
      });
    }

    return {
      result: {
        coefficients: coeffs,
        polynomial: this.formatPolynomial(coeffs, pts.map((p) => p.x)),
        evaluatedAt: input.evalAt,
        evaluatedValue: evalResult !== null ? round(evalResult) : undefined,
      },
      steps,
      plotData: {
        type: 'points',
        marks: pts.map((p) => ({ x: p.x, y: p.y, label: `(${p.x},${p.y})` })),
      },
    };
  }

  private evaluate(pts: { x: number; y: number }[], F: number[][], x: number): number {
    const n = pts.length;
    let result = F[0][0];
    let prod = 1;
    for (let j = 1; j < n; j++) {
      prod *= x - pts[j - 1].x;
      result += F[0][j] * prod;
    }
    return result;
  }

  private formatPolynomial(coeffs: number[], xs: number[]): string {
    // Se escribe como en el cuaderno: «− 0.1438(x − 1)(x − 2)» y no
    // «+ -0.1438 (x - 1)(x - 2)».
    let texto = fmt(coeffs[0]);
    let prod = '';
    for (let j = 1; j < coeffs.length; j++) {
      const xj = xs[j - 1];
      prod += xj === 0 ? 'x' : xj < 0 ? `(x + ${fmt(-xj)})` : `(x − ${fmt(xj)})`;
      const c = coeffs[j];
      if (c === 0) continue;
      texto += `${c < 0 ? ' − ' : ' + '}${fmt(Math.abs(c))}${prod}`;
    }
    return 'P(x) = ' + texto;
  }

  /**
   * Modo práctica: una fila por coeficiente b_k = f[x_0, …, x_k]. Si se pidió
   * evaluar, la fila también lleva el término T_k = b_k·(x − x_0)…(x − x_{k−1})
   * y la suma parcial T_0 + … + T_k (la última fila es P(x)). Los pasos de
   * solve() guardan columnas completas (vectores), que no caben en el
   * formulario de práctica, así que se comparan los valores que el estudiante
   * anota en el cuaderno.
   */
  validate(input: InterpolationInputDto, userSteps: Step[]): FeedbackResult {
    const { result, steps } = this.solve(input);
    const coefs = result.coefficients as number[];
    const pasoEval = input.evalAt !== undefined ? steps[steps.length - 1] : undefined;
    let suma = 0;
    const expected: Step[] = coefs.map((b, k) => {
      const state: Step['state'] = { coeficiente: b };
      if (pasoEval) {
        const termino = pasoEval.state[`termino${k}`] as number;
        suma += termino;
        state.termino = termino;
        state.sumaParcial = round(suma);
      }
      return { iteration: k, state };
    });
    return this.feedback.compare(expected, userSteps);
  }
}

/** f[x_a, ..., x_b] escrito completo si son pocos puntos, con … si son muchos. */
function corchete(desde: number, hasta: number): string {
  const idx = Array.from({ length: hasta - desde + 1 }, (_, k) => `x_{${desde + k}}`);
  return idx.length <= 3 ? `f[${idx.join(', ')}]` : `f[x_{${desde}}, \\dots, x_{${hasta}}]`;
}

/** Envuelve en paréntesis un número de texto negativo: − (−0.14). */
function parTxt(t: string): string {
  return t.startsWith('−') ? `(${t})` : t;
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
