import { create, all } from 'mathjs';
import { BadRequestException } from '@nestjs/common';

const math = create(all, { number: 'number' });

// Limita evaluación a operaciones puramente matemáticas (sin import/eval/...).
const FORBIDDEN = ['import', 'createUnit', 'evaluate', 'parse', 'simplify'];
FORBIDDEN.forEach((name) => {
  try {
    math.import({ [name]: () => { throw new Error(`${name} no permitido`); } }, { override: true });
  } catch {
    /* ignore */
  }
});

export class Expr {
  private compiled: math.EvalFunction;
  private node: math.MathNode;

  constructor(public readonly source: string) {
    if (!source || source.trim().length === 0) {
      throw new BadRequestException('La expresión está vacía');
    }
    try {
      this.node = math.parse(source);
      this.compiled = this.node.compile();
    } catch (e: any) {
      throw new BadRequestException(`Expresión inválida: ${e.message}`);
    }
  }

  /** Evalúa la expresión con f(x). */
  eval(x: number): number {
    try {
      const v = this.compiled.evaluate({ x });
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new Error('La evaluación no produjo un número finito');
      }
      return v;
    } catch (e: any) {
      throw new BadRequestException(`Error al evaluar f(${x}): ${e.message}`);
    }
  }

  /** Devuelve la derivada simbólica respecto a x. */
  derivative(): Expr {
    try {
      const d = math.derivative(this.node, 'x');
      return new Expr(d.toString());
    } catch (e: any) {
      throw new BadRequestException(`No se pudo calcular la derivada: ${e.message}`);
    }
  }

  toLatex(): string {
    return this.node.toTex();
  }

  toString(): string {
    return this.node.toString();
  }
}
