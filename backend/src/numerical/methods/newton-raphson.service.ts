import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { NewtonInputDto } from '../dto/newton.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num, paren, rejilla } from '../../common/texto';

@Injectable()
export class NewtonRaphsonService {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: NewtonInputDto): SolveResult {
    const f = new Expr(input.fn);
    const df = f.derivative();
    const tol = input.tolerance ?? 1e-6;
    const maxIter = input.maxIter ?? 50;

    let x = input.x0;
    const steps: Step[] = [];

    for (let i = 1; i <= maxIter; i++) {
      const fx = f.eval(x);
      const dfx = df.eval(x);
      if (Math.abs(dfx) < 1e-14) {
        throw new BadRequestException(
          `Derivada nula en x=${x}: el método no puede continuar (división por cero).`,
        );
      }
      const xNext = x - fx / dfx;
      const error = Math.abs(xNext - x);

      steps.push({
        iteration: i,
        state: {
          x: round(x),
          fx: round(fx),
          dfx: round(dfx),
          xNext: round(xNext),
          error: round(error),
        },
        // x_n es la aproximación con la que arranca esta iteración y x_{n+1}
        // la que produce; se escriben con su índice real (x_0 -> x_1, ...)
        // para que se vea de dónde sale cada número.
        explanation:
          `Partimos de x_${i - 1} = ${num(x)}. Ahí la función vale f(x_${i - 1}) = ${num(fx)} ` +
          `y la derivada f'(x_${i - 1}) = ${num(dfx)}. Con la fórmula de Newton se obtiene ` +
          `la nueva aproximación x_${i} = ${num(xNext)}, que se movió ${num(error)} respecto a la anterior (error).`,
        // Una cuenta por cada columna de la tabla, con los valores reemplazados.
        latex: rejilla([
          [
            [`x_{${i - 1}}`, i === 1 ? `${round(x)} \\;\\text{(valor inicial)}` : `${round(x)} \\;\\text{(resultado de la iteración anterior)}`],
            [`f'(x)`, `${df.toLatex()} \\;\\text{(derivada de } f)`],
          ],
          [
            [`f(x_{${i - 1}})`, `${f.sustituirLatex(x)} = ${round(fx)}`],
            [`f'(x_{${i - 1}})`, `${df.sustituirLatex(x)} = ${round(dfx)}`],
          ],
          [[`x_{${i}}`, `x_{${i - 1}} - \\frac{f(x_{${i - 1}})}{f'(x_{${i - 1}})} = ${round(x)} - \\frac{${round(fx)}}{${round(dfx)}} = ${round(xNext)}`]],
          [[`E`, `|x_{${i}} - x_{${i - 1}}| = |${round(xNext)} - ${paren(x)}| = ${round(error)}`]],
        ]),
      });

      x = xNext;
      if (error < tol || Math.abs(fx) < tol) break;
    }

    const lastFx = f.eval(x);

    return {
      result: {
        root: round(x),
        fAtRoot: round(lastFx),
        iterations: steps.length,
        derivative: df.toString(),
        converged: Math.abs(lastFx) < tol,
      },
      steps,
      plotData: {
        type: 'function',
        fnSource: input.fn,
        xRange: [Math.min(input.x0 - 2, x - 2), Math.max(input.x0 + 2, x + 2)],
        marks: steps.map((s) => ({ x: s.state.x as number, y: s.state.fx as number, label: `x${s.iteration}` })),
      },
    };
  }

  validate(input: NewtonInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
