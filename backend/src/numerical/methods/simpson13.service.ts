import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { IntegrationInputDto } from '../dto/integration.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num, paren, rejilla } from '../../common/texto';
import { desgloseLatex, explicarNodo } from '../shared/integracion.texto';

@Injectable()
export class Simpson13Service {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: IntegrationInputDto): SolveResult {
    const f = new Expr(input.fn);
    const { a, b, n } = input;
    if (a >= b) throw new BadRequestException('Se requiere a < b');
    if (n % 2 !== 0) throw new BadRequestException('Simpson 1/3 requiere n par.');

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
        state: {
          i,
          x: round(x),
          y: round(y),
          weight: i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2,
        },
        ...explicarNodo({
          i, n, a, b, h, x, y, f,
          peso: i === 0 || i === n
            ? { valor: 1, razon: 'es un extremo' }
            : i % 2 !== 0
              ? { valor: 4, razon: 'su índice es impar (es el centro de una parábola)' }
              : { valor: 2, razon: 'su índice es par (une dos parábolas vecinas)' },
        }),
      });
    }

    let sum = ys[0] + ys[n];
    for (let i = 1; i < n; i++) sum += (i % 2 !== 0 ? 4 : 2) * ys[i];
    const integral = (h / 3) * sum;

    // Cada altura con su peso a la vista, para poder reproducir la cuenta
    // en el cuaderno.
    const peso = (i: number) => (i === 0 || i === n ? 1 : i % 2 !== 0 ? 4 : 2);
    const desglose = desgloseLatex(ys, peso);

    steps.push({
      iteration: n + 1,
      state: { h: round(h), sum: round(sum), integral: round(integral) },
      explanation:
        `Se suman las alturas con su peso: los extremos una vez, los nodos impares por 4 y los pares interiores por 2. ` +
        `La suma ponderada da S = ${num(sum)}. Multiplicándola por h/3 = ${num(h / 3)} se obtiene la integral aproximada: ${num(integral)}.`,
      // Una cuenta por cada columna: h, S e integral.
      latex: rejilla([
        [['h', `\\frac{b-a}{n} = \\frac{${round(b)} - ${paren(a)}}{${n}} = ${round(h)}`]],
        [['S', `f(x_0) + 4f(x_1) + 2f(x_2) + \\dots + f(x_{${n}}) = ${desglose} = ${round(sum)}`]],
        [[`I`, `\\int_{${a}}^{${b}} f(x)\\,dx \\approx \\frac{h}{3}\\,S = \\frac{${round(h)}}{3}(${round(sum)}) = ${round(integral)}`]],
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
