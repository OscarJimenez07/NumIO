import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { IntegrationInputDto } from '../dto/integration.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

@Injectable()
export class TrapezoidalService {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: IntegrationInputDto): SolveResult {
    const f = new Expr(input.fn);
    const { a, b, n } = input;
    if (a >= b) throw new BadRequestException('Se requiere a < b');
    if (n < 1) throw new BadRequestException('n debe ser ≥ 1');

    const h = (b - a) / n;
    const steps: Step[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= n; i++) {
      const x = a + i * h;
      const y = f.eval(x);
      xs.push(round(x));
      ys.push(round(y));

      steps.push({
        iteration: i,
        state: { i, x: round(x), y: round(y) },
        explanation: `x_${i} = ${round(x)}, f(x_${i}) = ${round(y)}.`,
      });
    }

    let sum = ys[0] + ys[ys.length - 1];
    for (let i = 1; i < n; i++) sum += 2 * ys[i];
    const integral = (h / 2) * sum;

    steps.push({
      iteration: n + 1,
      state: { h: round(h), sum: round(sum), integral: round(integral) },
      explanation: `Integral aproximada = (h/2) · [f(x_0) + 2·Σf(x_i) + f(x_n)] = (${round(h)}/2)·${round(sum)} = ${round(integral)}.`,
      latex: `\\int_{${a}}^{${b}} f(x)\\,dx \\approx ${round(integral)}`,
    });

    return {
      result: {
        integral: round(integral),
        h: round(h),
        n,
      },
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
