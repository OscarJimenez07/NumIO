import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../shared/step.types';
import { InterpolationInputDto, PointDto } from '../dto/interpolation.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

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
      const num: string[] = [];
      const den: number[] = [];
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        num.push(`(x - ${pts[j].x})`);
        den.push(xi - pts[j].x);
      }
      const denProd = den.reduce((a, b) => a * b, 1);
      lTexts.push(`L_${i}(x) = ${num.join(' · ')} / ${round(denProd)}`);

      steps.push({
        iteration: i + 1,
        state: {
          i,
          xi: round(xi),
          yi: round(pts[i].y),
          denominator: round(denProd),
        },
        explanation: `Construyendo L_${i}(x) con x_${i} = ${xi}, y_${i} = ${pts[i].y}. Producto del denominador = ${round(denProd)}.`,
        latex: `L_{${i}}(x) = \\prod_{j \\ne ${i}} \\frac{x - x_j}{x_{${i}} - x_j} = ${round(denProd) !== 0 ? `\\frac{...}{${round(denProd)}}` : ''}`,
      });
    }

    let evalResult: number | null = null;
    if (input.evalAt !== undefined) {
      evalResult = this.evaluate(pts, input.evalAt);
      steps.push({
        iteration: n + 1,
        state: {
          xEval: input.evalAt,
          P: round(evalResult),
        },
        explanation: `Evaluación: P(${input.evalAt}) = Σ y_i · L_i(${input.evalAt}) = ${round(evalResult)}.`,
        latex: `P(${input.evalAt}) = ${round(evalResult)}`,
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

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
