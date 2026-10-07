import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { IntegrationInputDto } from '../dto/integration.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num, paren, rejilla } from '../../common/texto';
import { desgloseLatex, explicarNodo } from '../shared/integracion.texto';

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
        ...explicarNodo({
          i, n, a, b, h, x, y, f,
          peso: {
            valor: weight,
            razon:
              i === 0 || i === n
                ? 'es un extremo'
                : i % 3 === 0
                  ? 'su índice es múltiplo de 3 (une dos tramos cúbicos vecinos)'
                  : 'es un punto interior de un tramo cúbico',
          },
        }),
      });
    }

    let sum = ys[0] + ys[n];
    for (let i = 1; i < n; i++) sum += (i % 3 === 0 ? 2 : 3) * ys[i];
    const integral = ((3 * h) / 8) * sum;

    const peso = (i: number) => (i === 0 || i === n ? 1 : i % 3 === 0 ? 2 : 3);
    const desglose = desgloseLatex(ys, peso);

    steps.push({
      iteration: n + 1,
      state: { h: round(h), sum: round(sum), integral: round(integral) },
      explanation:
        `Se suman las alturas con su peso: los extremos una vez, los nodos múltiplos de 3 por 2 y los demás por 3. ` +
        `La suma ponderada da S = ${num(sum)}. Multiplicándola por 3h/8 = ${num((3 * h) / 8)} se obtiene la integral aproximada: ${num(integral)}.`,
      // Una cuenta por cada columna: h, S e integral.
      latex: rejilla([
        [['h', `\\frac{b-a}{n} = \\frac{${round(b)} - ${paren(a)}}{${n}} = ${round(h)}`]],
        [['S', `f(x_0) + 3f(x_1) + 3f(x_2) + 2f(x_3) + \\dots + f(x_{${n}}) = ${desglose} = ${round(sum)}`]],
        [[`I`, `\\int_{${a}}^{${b}} f(x)\\,dx \\approx \\frac{3h}{8}\\,S = \\frac{3(${round(h)})}{8}(${round(sum)}) = ${round(integral)}`]],
      ]),
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
