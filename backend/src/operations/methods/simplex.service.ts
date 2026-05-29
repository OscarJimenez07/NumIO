import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../../numerical/shared/step.types';
import { SimplexInputDto, SimplexObjective } from '../dto/simplex.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

@Injectable()
export class SimplexService {
  constructor(private readonly feedback: FeedbackService) {}

  /**
   * Símplex tabular estándar (forma canónica con maximización).
   * Acepta restricciones <=, >=, = añadiendo holguras y variables artificiales (Big-M no implementado;
   * se asume que el problema admite solución por el método estándar tras transformación a <=).
   */
  solve(input: SimplexInputDto): SolveResult {
    const { c, constraints, objective } = input;
    if (!c || c.length === 0) throw new BadRequestException('Se requieren coeficientes c.');
    if (!constraints || constraints.length === 0) {
      throw new BadRequestException('Se requiere al menos una restricción.');
    }

    const numVars = c.length;
    const numCons = constraints.length;

    // Transformar a forma estándar con holguras: para cada restricción <= se añade s_i.
    // >= se multiplica por -1; = se trata como <= y luego = (no exhaustivo, asume problemas estándar).
    const A: number[][] = [];
    const b: number[] = [];
    for (const ct of constraints) {
      if (ct.coefficients.length !== numVars) {
        throw new BadRequestException('Cada restricción debe tener el mismo número de coeficientes que c.');
      }
      if (ct.operator === '<=') {
        A.push([...ct.coefficients]);
        b.push(ct.rhs);
      } else if (ct.operator === '>=') {
        A.push(ct.coefficients.map((v) => -v));
        b.push(-ct.rhs);
      } else {
        // '=' — convertimos en dos: <= y >=. Para didáctica simple, tratamos como <= (forma estándar).
        A.push([...ct.coefficients]);
        b.push(ct.rhs);
      }
    }

    if (b.some((v) => v < 0)) {
      throw new BadRequestException(
        'Esta implementación no soporta b_i negativos tras transformar restricciones (problema requiere Big-M / dos fases).',
      );
    }

    // Construir tabla inicial: filas = restricciones, columnas = vars + holguras + RHS
    const totalCols = numVars + numCons + 1;
    const tableau: number[][] = Array.from({ length: numCons + 1 }, () => Array(totalCols).fill(0));
    for (let i = 0; i < numCons; i++) {
      for (let j = 0; j < numVars; j++) tableau[i][j] = A[i][j];
      tableau[i][numVars + i] = 1; // holgura
      tableau[i][totalCols - 1] = b[i];
    }
    // Fila Z (última): para max Z = c·x, escribimos -c en fila Z (forma estándar).
    const cAdjusted = objective === SimplexObjective.MAX ? c.map((v) => -v) : c.map((v) => v);
    for (let j = 0; j < numVars; j++) tableau[numCons][j] = cAdjusted[j];

    const basis: number[] = Array.from({ length: numCons }, (_, i) => numVars + i);
    const steps: Step[] = [];
    const maxIter = 100;

    steps.push({
      iteration: 0,
      state: {
        tableau: tableau.map((r) => r.map(round)).flat(),
        rows: numCons + 1,
        cols: totalCols,
        basis: [...basis],
        z: round(tableau[numCons][totalCols - 1]),
      },
      explanation: 'Tabla inicial con variables de holgura como base.',
    });

    for (let iter = 1; iter <= maxIter; iter++) {
      // Encontrar columna pivote (más negativa en fila Z para max; más positiva si min y manejamos diferente)
      const zRow = tableau[numCons];
      let pivotCol = -1;
      let minVal = 0;
      for (let j = 0; j < totalCols - 1; j++) {
        if (zRow[j] < minVal - 1e-12) {
          minVal = zRow[j];
          pivotCol = j;
        }
      }
      if (pivotCol === -1) break; // óptimo alcanzado

      // Encontrar fila pivote (mínimo cociente positivo)
      let pivotRow = -1;
      let minRatio = Number.POSITIVE_INFINITY;
      for (let i = 0; i < numCons; i++) {
        if (tableau[i][pivotCol] > 1e-12) {
          const ratio = tableau[i][totalCols - 1] / tableau[i][pivotCol];
          if (ratio < minRatio) {
            minRatio = ratio;
            pivotRow = i;
          }
        }
      }
      if (pivotRow === -1) {
        return {
          result: { unbounded: true, iterations: steps.length },
          steps,
          message: 'Problema no acotado: no existe solución óptima finita.',
        };
      }

      // Pivoteo
      const pivot = tableau[pivotRow][pivotCol];
      for (let j = 0; j < totalCols; j++) tableau[pivotRow][j] /= pivot;
      for (let i = 0; i <= numCons; i++) {
        if (i === pivotRow) continue;
        const factor = tableau[i][pivotCol];
        for (let j = 0; j < totalCols; j++) tableau[i][j] -= factor * tableau[pivotRow][j];
      }
      basis[pivotRow] = pivotCol;

      steps.push({
        iteration: iter,
        state: {
          tableau: tableau.map((r) => r.map(round)).flat(),
          rows: numCons + 1,
          cols: totalCols,
          basis: [...basis],
          pivotRow,
          pivotCol,
          z: round(tableau[numCons][totalCols - 1] * (objective === SimplexObjective.MAX ? 1 : 1)),
        },
        explanation: `Iteración ${iter}: variable entrante x_${pivotCol + 1}, sale fila ${pivotRow + 1} (pivot=${round(pivot)}). Z actual = ${round(tableau[numCons][totalCols - 1])}.`,
      });
    }

    // Solución
    const x = Array(numVars).fill(0);
    for (let i = 0; i < numCons; i++) {
      if (basis[i] < numVars) x[basis[i]] = round(tableau[i][totalCols - 1]);
    }
    let zOpt = tableau[numCons][totalCols - 1];
    if (objective === SimplexObjective.MAX) zOpt = zOpt; // ya es valor óptimo (Z se mantiene)

    return {
      result: {
        x: x.map(round),
        z: round(zOpt),
        iterations: steps.length - 1,
        basis: [...basis],
      },
      steps,
      plotData: undefined,
    };
  }

  validate(input: SimplexInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
