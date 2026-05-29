import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { IntegrationInputDto } from '../dto/integration.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

@Injectable()
export class Simpson38Service {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: IntegrationInputDto): SolveResult {
    const f = new Expr(input.fn);
    const { a, b, n } = input;
    if (a >= b) throw new BadRequestException('Se requiere a < b');
    if (n % 3 !== 0) throw new BadRequestException('Simpson 3/8 requiere n múltiplo de 3.');

    const h = (b - a) / n;
    const steps: Step[] = [];
    const xs: number[] = [];
    const ys: number[] = [];

    for (let i = 0; i <= n; i++) {
      const x = a + i * h;
      const y = f.eval(x);
      xs.push(round(x));
      ys.push(round(y));
      const weight = i === 0 || i === n ? 1 : i % 3 === 0 ? 2 : 3;
      steps.push({
        iteration: i,
        state: { i, x: round(x), y: round(y), weight },
        explanation: `x_${i} = ${round(x)}, f(x_${i}) = ${round(y)}, peso = ${weight}.`,
      });
    }

    let sum = ys[0] + ys[n];
    for (let i = 1; i < n; i++) sum += (i % 3 === 0 ? 2 : 3) * ys[i];
    const integral = ((3 * h) / 8) * sum;

    steps.push({
      iteration: n + 1,
      state: { h: round(h), sum: round(sum), integral: round(integral) },
      explanation: `Integral ≈ (3h/8) · Σ pesos · f(x_i) = (3·${round(h)}/8)·${round(sum)} = ${round(integral)}.`,
      latex: `\\int_{${a}}^{${b}} f(x)\\,dx \\approx ${round(integral)}`,
    });

    return {
      result: { integral: round(integral), h: round(h), n },
      steps,
      plotData: {
        type: 'integral',
        fnSource: input.fn,
        xRange: [a, b],
        marks: xs.map((x, i) => ({ x, y: ys[i], label: `x${i}` })),
      },
    };
  }

  validate(input: IntegrationInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
