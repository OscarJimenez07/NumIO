import { BadRequestException, Injectable } from '@nestjs/common';
import { Expr } from '../shared/expression.parser';
import { SolveResult, Step } from '../shared/step.types';
import { BisectionInputDto } from '../dto/bisection.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { intervalo, num, paren, rejilla } from '../../common/texto';

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
    // Qué extremo se reemplazó por el punto medio en la iteración anterior,
    // para mostrar de dónde sale el a y el b de cada fila.
    let reemplazado: 'a' | 'b' | null = null;

    for (i = 1; i <= maxIter; i++) {
      const origen = (extremo: 'a' | 'b', valor: number) =>
        i === 1
          ? `${round(valor)} \\;\\text{(dato inicial)}`
          : reemplazado === extremo
            ? `c_{${i - 1}} = ${round(valor)}`
            : `${round(valor)} \\;\\text{(no cambia)}`;
      c = (a + b) / 2;
      fc = f.eval(c);
      error = i === 1 ? Math.abs(b - a) / 2 : Math.abs(c - prev);

      // En la primera iteración el error es la mitad del intervalo, porque
      // todavía no hay un punto medio anterior con el que comparar; desde la
      // segunda es la distancia entre dos puntos medios consecutivos.
      const errorExplicado =
        i === 1
          ? `El error es la mitad del ancho del intervalo: ${num(error)}.`
          : `El error es la distancia al punto medio anterior c_${i - 1} = ${num(prev)}: ${num(error)}.`;
      const errorLatex: [string, string] =
        i === 1
          ? [`E_{1}`, `\\frac{b-a}{2} = \\frac{${round(b)} - ${paren(a)}}{2} = ${round(error)}`]
          : [`E_{${i}}`, `|c_{${i}} - c_{${i - 1}}| = |${round(c)} - ${paren(prev)}| = ${round(error)}`];

      // Si f(a) y f(c) tienen signos opuestos, la raíz queda entre a y c.
      const faActual = f.eval(a);
      const izquierda = faActual * fc < 0;
      const decision = izquierda
        ? `f(c_${i}) y f(a) = ${num(faActual)} tienen signos opuestos, así que la raíz está entre a y c_${i}: el nuevo intervalo es ${intervalo(a, c)}.`
        : `f(c_${i}) tiene el mismo signo que f(a) = ${num(faActual)}, así que la raíz está entre c_${i} y b: el nuevo intervalo es ${intervalo(c, b)}.`;

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
        explanation:
          `El punto medio del intervalo ${intervalo(a, b)} es c_${i} = ${num(c)}, y ahí la función vale f(c_${i}) = ${num(fc)}. ` +
          `${decision} ${errorExplicado}`,
        // Una cuenta por cada columna de la tabla, en el mismo orden.
        latex: rejilla([
          [['a', origen('a', a)], ['b', origen('b', b)]],
          [['f(a)', `${f.sustituirLatex(a)} = ${round(faActual)}`], ['f(b)', `${f.sustituirLatex(b)} = ${round(f.eval(b))}`]],
          [[`c_{${i}}`, `\\frac{a+b}{2} = \\frac{${round(a)} + ${paren(b)}}{2} = ${round(c)}`], [`f(c_{${i}})`, `${f.sustituirLatex(c)} = ${round(fc)}`]],
          [errorLatex],
        ]),
      });

      if (Math.abs(fc) < tol || error < tol) break;
      if (izquierda) b = c;
      else a = c;
      reemplazado = izquierda ? 'b' : 'a';
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
