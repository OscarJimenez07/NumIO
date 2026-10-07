import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { IntegrationInputDto } from '../dto/integration.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num, paren, rejilla } from '../../common/texto';
import { explicarNodo } from '../shared/integracion.texto';

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
        ...explicarNodo({
          i, n, a, b, h, x, y, f,
          peso: i === 0 || i === n
            ? { valor: 1, razon: 'es un extremo (solo pertenece a un trapecio)' }
            : { valor: 2, razon: 'es interior (es lado de dos trapecios vecinos)' },
        }),
      });
    }

    let sum = ys[0] + ys[ys.length - 1];
    for (let i = 1; i < n; i++) sum += 2 * ys[i];
    const integral = (h / 2) * sum;

    // Se desglosa cómo se forma la suma ponderada: los extremos entran una vez
    // y los interiores dos, porque cada nodo interior es lado derecho de un
    // trapecio e izquierdo del siguiente.
    const interiores = ys.slice(1, n);
    const sumaInterior = round(interiores.reduce((s, v) => s + v, 0));
    const interioresTex = interiores.map((v, k) => (k === 0 ? String(v) : paren(v))).join(' + ');

    steps.push({
      iteration: n + 1,
      state: {
        h: round(h),
        sumaInterior,
        sum: round(sum),
        integral: round(integral),
      },
      explanation:
        `Se suman las alturas con su peso: los extremos una vez y los ${n - 1} nodos interiores dos veces ` +
        `(los interiores suman ${num(sumaInterior)}). La suma ponderada da S = ${num(sum)}. ` +
        `Multiplicándola por h/2 = ${num(h / 2)} se obtiene la integral aproximada: ${num(integral)}.`,
      // Una cuenta por cada columna: h, suma de interiores, S e integral.
      latex: rejilla([
        [
          ['h', `\\frac{b-a}{n} = \\frac{${round(b)} - ${paren(a)}}{${n}} = ${round(h)}`],
          ...(interiores.length
            ? [[`\\textstyle\\sum f(x_i)`, `${interioresTex} = ${sumaInterior}`] as [string, string]]
            : []),
        ],
        [[
          'S',
          interiores.length
            ? `f(x_0) + 2\\textstyle\\sum f(x_i) + f(x_{${n}}) = ${ys[0]} + 2(${sumaInterior}) + ${paren(ys[n])} = ${round(sum)}`
            : `f(x_0) + f(x_{${n}}) = ${ys[0]} + ${paren(ys[n])} = ${round(sum)}`,
        ]],
        [[`I`, `\\int_{${a}}^{${b}} f(x)\\,dx \\approx \\frac{h}{2}\\,S = \\frac{${round(h)}}{2}(${round(sum)}) = ${round(integral)}`]],
      ]),
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
