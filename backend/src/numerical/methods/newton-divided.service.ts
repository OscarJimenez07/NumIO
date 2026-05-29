import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../shared/step.types';
import { InterpolationInputDto } from '../dto/interpolation.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

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
      steps.push({
        iteration: j,
        state: {
          order: j,
          column: F.slice(0, n - j).map((row) => round(row[j])) as number[],
        },
        explanation: `Orden ${j}: f[x_i,...,x_{i+${j}}] = (f[x_{i+1},...,x_{i+${j}}] - f[x_i,...,x_{i+${j}-1}]) / (x_{i+${j}} - x_i).`,
      });
    }

    // Coeficientes del polinomio: F[0][0], F[0][1], ..., F[0][n-1]
    const coeffs = F[0].slice(0, n).map((v) => round(v));

    let evalResult: number | null = null;
    if (input.evalAt !== undefined) {
      evalResult = this.evaluate(pts, F, input.evalAt);
      steps.push({
        iteration: n,
        state: {
          xEval: input.evalAt,
          P: round(evalResult),
        },
        explanation: `Evaluación con forma de Newton: P(${input.evalAt}) = ${round(evalResult)}.`,
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
    const parts = [coeffs[0].toString()];
    let prod = '';
    for (let j = 1; j < coeffs.length; j++) {
      prod += `(x - ${xs[j - 1]})`;
      parts.push(`${coeffs[j]} ${prod}`);
    }
    return 'P(x) = ' + parts.join(' + ');
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
