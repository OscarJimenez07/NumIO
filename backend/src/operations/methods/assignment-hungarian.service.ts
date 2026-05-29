import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../../numerical/shared/step.types';
import { AssignmentInputDto } from '../dto/assignment.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

@Injectable()
export class AssignmentHungarianService {
  constructor(private readonly feedback: FeedbackService) {}

  solve(input: AssignmentInputDto): SolveResult {
    const original = input.costs;
    if (!original || original.length === 0) {
      throw new BadRequestException('Matriz de costos vacía.');
    }
    const n = Math.max(original.length, ...original.map((r) => r.length));

    // Rellenar a cuadrada con costos altos si fuera necesario
    const M = 1e9;
    let cost: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (original[i]?.[j] ?? M)),
    );

    const steps: Step[] = [];

    // Si es maximización, transformar
    if (input.maximize) {
      const max = Math.max(...cost.flat().filter((x) => x < M));
      cost = cost.map((row) => row.map((v) => (v >= M ? v : max - v)));
      steps.push({
        iteration: 0,
        state: { matrix: cost.map((r) => r.map(round)).flat(), n },
        explanation: `Maximización: matriz transformada restando cada valor del máximo (${max}).`,
      });
    }

    // Paso 1: restar mínimo de cada fila
    for (let i = 0; i < n; i++) {
      const min = Math.min(...cost[i]);
      for (let j = 0; j < n; j++) cost[i][j] -= min;
    }
    steps.push({
      iteration: 1,
      state: { matrix: cost.map((r) => r.map(round)).flat(), n },
      explanation: 'Paso 1: restar el mínimo de cada fila.',
    });

    // Paso 2: restar mínimo de cada columna
    for (let j = 0; j < n; j++) {
      let min = Number.POSITIVE_INFINITY;
      for (let i = 0; i < n; i++) min = Math.min(min, cost[i][j]);
      if (min > 0 && min < M) for (let i = 0; i < n; i++) cost[i][j] -= min;
    }
    steps.push({
      iteration: 2,
      state: { matrix: cost.map((r) => r.map(round)).flat(), n },
      explanation: 'Paso 2: restar el mínimo de cada columna.',
    });

    // Paso 3-5: cubrir ceros con mínimo de líneas y ajustar
    let iteration = 3;
    while (true) {
      const { lines, rowCovered, colCovered } = this.minLinesCover(cost);
      steps.push({
        iteration: iteration++,
        state: { lines, rowsCovered: rowCovered.filter(Boolean).length, colsCovered: colCovered.filter(Boolean).length, n },
        explanation: `Cubrir todos los ceros con ${lines} línea(s).`,
      });
      if (lines >= n) break;

      // Encontrar mínimo no cubierto, restarlo de no cubiertos y sumarlo a doblemente cubiertos
      let minUncovered = Number.POSITIVE_INFINITY;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          if (!rowCovered[i] && !colCovered[j] && cost[i][j] < minUncovered) minUncovered = cost[i][j];

      if (!Number.isFinite(minUncovered)) break;

      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (!rowCovered[i] && !colCovered[j]) cost[i][j] -= minUncovered;
          else if (rowCovered[i] && colCovered[j]) cost[i][j] += minUncovered;
        }
      steps.push({
        iteration: iteration++,
        state: { matrix: cost.map((r) => r.map(round)).flat(), n, minUncovered: round(minUncovered) },
        explanation: `Ajuste: mínimo no cubierto = ${round(minUncovered)}. Restado a no cubiertos, sumado a doblemente cubiertos.`,
      });
      if (iteration > 200) break; // safety
    }

    // Asignación óptima por matching greedy en ceros (asignación única)
    const assignment = this.findAssignment(cost);
    let total = 0;
    for (const [i, j] of assignment) {
      if (i < original.length && j < (original[i]?.length ?? 0)) total += original[i][j];
    }

    return {
      result: {
        assignment: assignment.map(([i, j]) => ({ task: i + 1, resource: j + 1 })),
        totalCost: round(total),
        n,
      },
      steps,
    };
  }

  private minLinesCover(matrix: number[][]): { lines: number; rowCovered: boolean[]; colCovered: boolean[] } {
    const n = matrix.length;
    // Asignación máxima por matching de ceros
    const rowMatch = Array(n).fill(-1);
    const colMatch = Array(n).fill(-1);

    const tryAssign = (i: number, visited: boolean[]): boolean => {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 0 && !visited[j]) {
          visited[j] = true;
          if (colMatch[j] === -1 || tryAssign(colMatch[j], visited)) {
            rowMatch[i] = j;
            colMatch[j] = i;
            return true;
          }
        }
      }
      return false;
    };

    for (let i = 0; i < n; i++) tryAssign(i, Array(n).fill(false));

    // Cobertura mínima por König
    const rowCovered = Array(n).fill(false);
    const colCovered = Array(n).fill(false);
    const rowMarked = rowMatch.map((m) => m === -1);
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        if (rowMarked[i]) {
          for (let j = 0; j < n; j++) {
            if (matrix[i][j] === 0 && !colCovered[j]) {
              colCovered[j] = true;
              changed = true;
            }
          }
        }
      }
      for (let j = 0; j < n; j++) {
        if (colCovered[j] && colMatch[j] !== -1 && !rowMarked[colMatch[j]]) {
          rowMarked[colMatch[j]] = true;
          changed = true;
        }
      }
    }
    for (let i = 0; i < n; i++) if (!rowMarked[i]) rowCovered[i] = true;

    const lines = rowCovered.filter(Boolean).length + colCovered.filter(Boolean).length;
    return { lines, rowCovered, colCovered };
  }

  private findAssignment(matrix: number[][]): Array<[number, number]> {
    const n = matrix.length;
    const rowMatch = Array(n).fill(-1);
    const colMatch = Array(n).fill(-1);

    const tryAssign = (i: number, visited: boolean[]): boolean => {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] === 0 && !visited[j]) {
          visited[j] = true;
          if (colMatch[j] === -1 || tryAssign(colMatch[j], visited)) {
            rowMatch[i] = j;
            colMatch[j] = i;
            return true;
          }
        }
      }
      return false;
    };

    for (let i = 0; i < n; i++) tryAssign(i, Array(n).fill(false));

    const result: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) if (rowMatch[i] !== -1) result.push([i, rowMatch[i]]);
    return result;
  }

  validate(input: AssignmentInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
