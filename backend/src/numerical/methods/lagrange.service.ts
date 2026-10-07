import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../shared/step.types';
import { InterpolationInputDto, PointDto } from '../dto/interpolation.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num as fmt, pares, paren, rejilla } from '../../common/texto';

@Injectable()
export class LagrangeService {
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
    const steps: Step[] = [];

    // Calcular cada L_i evaluado simbólicamente (formato texto)
    const lTexts: string[] = [];
    for (let i = 0; i < n; i++) {
      const xi = pts[i].x;
      const otros = pts.filter((_, j) => j !== i).map((p) => p.x);
      const den = otros.map((xj) => xi - xj);
      const denProd = den.reduce((a, b) => a * b, 1);

      // El productorio es notación compacta pero opaca para quien empieza.
      // Se muestran los factores concretos y la cuenta del denominador, que
      // es justo lo que el estudiante tiene que reproducir en el cuaderno.
      const factores = otros.map(factorX).join('');
      lTexts.push(`L_${i}(x) = ${factoresTxtPoli(otros)} / ${denProd < 0 ? `(${fmt(denProd)})` : fmt(denProd)}`);
      const denTex = otros.map((xj) => `(${round(xi)} - ${paren(xj)})`).join('');
      const factoresTxt = otros.map(factorX).join('').replace(/-/g, '−');
      const denTxt = otros.map((xj) => `(${fmt(xi)} − ${fmt(xj).startsWith('−') ? `(${fmt(xj)})` : fmt(xj)})`).join('');

      steps.push({
        iteration: i + 1,
        state: {
          i,
          xi: round(xi),
          yi: round(pts[i].y),
          denominator: round(denProd),
        },
        explanation:
          `Base L_${i}, del punto (${fmt(xi)}, ${fmt(pts[i].y)}). Arriba va un factor (x − x_j) por cada uno de los otros puntos: ${factoresTxt}. ` +
          `Abajo va el mismo producto cambiando x por x_${i} = ${fmt(xi)}: ${denTxt} = ${fmt(denProd)}. ` +
          `Así la base vale 1 en x_${i} y 0 en los demás puntos.`,
        latex: rejilla([
          [[`x_{${i}}`, `${round(xi)}`], [`y_{${i}}`, `${round(pts[i].y)} \\;\\text{(punto ${i + 1} de los datos)}`]],
          [[`\\text{Denominador}`, `${denTex} = ${round(denProd)}`]],
          [[`L_{${i}}(x)`, `\\frac{${factores}}{${denTex}} = \\frac{${factores}}{${round(denProd)}}`]],
        ]),
      });
    }

    let evalResult: number | null = null;
    if (input.evalAt !== undefined) {
      const xe = input.evalAt;
      evalResult = this.evaluate(pts, xe);

      // Cada base evaluada en el punto pedido. Sin esto el paso final saltaba
      // de la fórmula general al resultado, ocultando justamente la cuenta
      // que el estudiante tiene que reproducir.
      const lVals = pts.map((_, i) => {
        let li = 1;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          li *= (xe - pts[j].x) / (pts[i].x - pts[j].x);
        }
        return li;
      });
      const sustitucion = pts
        .map((p, i) => `${i === 0 ? round(p.y) : paren(p.y)}(${round(lVals[i])})`)
        .join(' + ');
      const productos = pts
        .map((p, i) => (i === 0 ? String(round(p.y * lVals[i])) : paren(p.y * lVals[i])))
        .join(' + ');
      const generica = pts.map((_, i) => `y_{${i}}L_{${i}}`).join(' + ');

      steps.push({
        iteration: n + 1,
        state: {
          xEval: xe,
          ...Object.fromEntries(lVals.map((v, i) => [`L${i}`, round(v)])),
          sumaPesos: round(lVals.reduce((a, b) => a + b, 0)),
          P: round(evalResult),
        },
        explanation:
          `Se evalúa cada base en x = ${fmt(xe)}: ` +
          pts.map((_, i) => `L_${i} = ${fmt(lVals[i])}`).join(', ') +
          ` (siempre suman ${fmt(lVals.reduce((a, b) => a + b, 0))}). ` +
          `Luego cada y_i se multiplica por su base y se suman los resultados: P(${fmt(xe)}) = ${fmt(evalResult)}.`,
        // Cada L_k(x) con su cuenta (dos por renglón), la suma de comprobación
        // y P(x): una cuenta por cada columna de la tabla.
        latex: rejilla([
          ...pares(
            pts.map((p, k): [string, string] => {
              const otrosK = pts.filter((_, j) => j !== k).map((q) => q.x);
              const denK = otrosK.reduce((acc, xj) => acc * (p.x - xj), 1);
              const numK = otrosK.map((xj) => `(${round(xe)} - ${paren(xj)})`).join('');
              return [`L_{${k}}(${round(xe)})`, `\\frac{${numK}}{${round(denK)}} = ${round(lVals[k])}`];
            }),
          ),
          [[`\\textstyle\\sum L_i`, `${lVals.map((v, k) => (k === 0 ? String(round(v)) : paren(v))).join(' + ')} = ${round(lVals.reduce((s, v) => s + v, 0))}`]],
          [[`P(${round(xe)})`, `${generica} = ${sustitucion} = ${productos} = ${round(evalResult)}`]],
        ]),
      });
    }

    // Plot points
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    const xMin = sorted[0].x - 0.5;
    const xMax = sorted[sorted.length - 1].x + 0.5;
    const samples: { x: number; y: number }[] = [];
    const N = 100;
    for (let k = 0; k <= N; k++) {
      const x = xMin + (k / N) * (xMax - xMin);
      samples.push({ x, y: this.evaluate(pts, x) });
    }

    return {
      result: {
        polynomial: lTexts.join('\n'),
        evaluatedAt: input.evalAt,
        evaluatedValue: evalResult !== null ? round(evalResult) : undefined,
        degree: n - 1,
      },
      steps,
      plotData: {
        type: 'points',
        points: samples,
        marks: pts.map((p) => ({ x: p.x, y: p.y, label: `(${p.x},${p.y})` })),
      },
    };
  }

  private evaluate(pts: PointDto[], x: number): number {
    let result = 0;
    for (let i = 0; i < pts.length; i++) {
      let li = 1;
      for (let j = 0; j < pts.length; j++) {
        if (j === i) continue;
        li *= (x - pts[j].x) / (pts[i].x - pts[j].x);
      }
      result += pts[i].y * li;
    }
    return result;
  }

  validate(input: InterpolationInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

/** Factor (x − xj) bien escrito: x si xj = 0, (x + 1) si xj = −1. */
function factorX(xj: number): string {
  if (xj === 0) return 'x';
  return xj < 0 ? `(x + ${round(-xj)})` : `(x - ${round(xj)})`;
}

/** Los mismos factores para el texto del polinomio, con «−» tipográfico. */
function factoresTxtPoli(otros: number[]): string {
  return otros.map(factorX).join('').replace(/-/g, '−');
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
