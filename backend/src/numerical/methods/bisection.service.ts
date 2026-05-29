import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { BisectionInputDto } from '../dto/bisection.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

@Injectable()
export class BisectionService {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: BisectionInputDto): SolveResult {
    const f = new Expr(input.fn);
    const tol = input.tolerance ?? 1e-4;
    const maxIter = input.maxIter ?? 100;
    let a = input.a;
    let b = input.b;

    if (a >= b) throw new BadRequestException('Se requiere a < b');
    const fa = f.eval(a);
    const fb = f.eval(b);
    if (fa * fb >= 0) {
      throw new BadRequestException(
        `f(a)·f(b) ≥ 0: el método de bisección requiere cambio de signo en [${a}, ${b}].`,
      );
    }

    const steps: Step[] = [];
    let c = a;
    let fc = fa;
    let prev = a;
    let error = Number.POSITIVE_INFINITY;
    let i = 0;

    for (i = 1; i <= maxIter; i++) {
      c = (a + b) / 2;
      fc = f.eval(c);
      error = i === 1 ? Math.abs(b - a) / 2 : Math.abs(c - prev);

      steps.push({
        iteration: i,
        state: {
          a: round(a),
          b: round(b),
          c: round(c),
          fa: round(f.eval(a)),
          fb: round(f.eval(b)),
          fc: round(fc),
          error: round(error),
        },
        explanation: `Iteración ${i}: c = (a+b)/2 = (${round(a)} + ${round(b)})/2 = ${round(c)}. f(c) = ${round(fc)}. ${
          fa * fc < 0 ? 'Como f(a)·f(c)<0, la raíz está en [a,c], por lo que b←c.' : 'Como f(a)·f(c)>0, la raíz está en [c,b], por lo que a←c.'
        }`,
        latex: `c_{${i}} = \\frac{a+b}{2} = ${round(c)}, \\quad f(c_{${i}}) = ${round(fc)}`,
      });

      if (Math.abs(fc) < tol || error < tol) break;
      if (f.eval(a) * fc < 0) b = c;
      else a = c;
      prev = c;
    }

    return {
      result: {
        root: round(c),
        fAtRoot: round(fc),
        iterations: steps.length,
        converged: Math.abs(fc) < tol || error < tol,
        finalError: round(error),
      },
      steps,
      plotData: {
        type: 'function',
        fnSource: input.fn,
        xRange: [input.a - 0.5, input.b + 0.5],
        marks: steps.map((s) => ({ x: s.state.c as number, y: s.state.fc as number, label: `c${s.iteration}` })),
      },
    };
  }

  validate(input: BisectionInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
