import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../../numerical/shared/step.types';
import { AssignmentInputDto } from '../dto/assignment.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num as fmt, redondear, rejilla } from '../../common/texto';

/**
 * Una línea por fila (o columna): T_1: min(3, 5, 11) = 3. Se omiten los costos
 * de relleno (M) y las líneas ficticias, que solo existen para cuadrar la matriz.
 */
function minimosLatex(lineas: number[][], minimos: number[], letra: string, M: number): string {
  const filas = lineas
    .map((vals, k) => {
      const reales = vals.filter((v) => v < M);
      if (reales.length === 0) return null;
      const min = minimos[k];
      const fin = min > 0 && min < M ? `\\;\\Rightarrow\\; \\text{restar } ${redondear(min)}` : '\\;\\Rightarrow\\; \\text{ya tiene un } 0';
      return `${letra}_{${k + 1}}:&\\ \\min(${reales.map((v) => redondear(v)).join(', ')}) = ${redondear(Math.min(...reales))}${fin}`;
    })
    .filter(Boolean);
  return `\\begin{aligned}${filas.join(' \\\\ ')}\\end{aligned}`;
}

/** «T_1 − 3, T_2 − 4» con las restas que sí se hicieron (sin filas ficticias). */
function restas(valores: number[], letra: string, M: number): string {
  return valores
    .map((v, k) => (v > 0 && v < M ? `${letra}_${k + 1} − ${fmt(v)}` : null))
    .filter(Boolean)
    .join(', ');
}

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
        state: { matrix: cost.map((r) => r.map((v) => round(v))).flat(), n },
        explanation:
          `Como se quiere maximizar, cada valor se resta del mayor de la matriz (${fmt(max)}). ` +
          'Así el valor más alto pasa a ser el costo más bajo y el problema se resuelve minimizando.',
        latex: `c'_{ij} = \\max_{ij}(c) - c_{ij} = ${max} - c_{ij}`,
      });
    }

    // Paso 1: restar mínimo de cada fila
    const minFilas: number[] = [];
    const filasAntes = cost.map((r) => [...r]);
    for (let i = 0; i < n; i++) {
      const min = Math.min(...cost[i]);
      minFilas.push(min);
      for (let j = 0; j < n; j++) cost[i][j] -= min;
    }
    steps.push({
      iteration: 1,
      state: { matrix: cost.map((r) => r.map((v) => round(v))).flat(), n },
      explanation:
        'Paso 1: a cada fila se le resta su valor más pequeño, para que cada tarea tenga al menos un 0: ' +
        `${restas(minFilas, 'T', M) || 'todas las filas ya tenían un 0'}.`,
      latex: minimosLatex(filasAntes, minFilas, 'T', M),
    });

    // Paso 2: restar mínimo de cada columna
    const minColumnas: number[] = [];
    // Columnas tal como quedaron tras el paso 1 (traspuestas para reusar el formato por filas).
    const columnasAntes = Array.from({ length: n }, (_, j) => cost.map((r) => r[j]));
    for (let j = 0; j < n; j++) {
      let min = Number.POSITIVE_INFINITY;
      for (let i = 0; i < n; i++) min = Math.min(min, cost[i][j]);
      const resta = min > 0 && min < M ? min : 0;
      minColumnas.push(resta);
      if (resta > 0) for (let i = 0; i < n; i++) cost[i][j] -= resta;
    }
    const restasColumnas = restas(minColumnas, 'R', M);
    steps.push({
      iteration: 2,
      state: { matrix: cost.map((r) => r.map((v) => round(v))).flat(), n },
      explanation: restasColumnas
        ? `Paso 2: a cada columna se le resta su valor más pequeño, para que cada recurso tenga al menos un 0: ${restasColumnas}. ` +
          'Las demás columnas ya tenían un 0 y no cambian.'
        : 'Paso 2: se revisan las columnas, pero todas ya tienen al menos un 0, así que no cambian.',
      latex: minimosLatex(columnasAntes, columnasAntes.map((col) => Math.min(...col)), 'R', M),
    });

    // Paso 3-5: cubrir ceros con mínimo de líneas y ajustar
    let iteration = 3;
    while (true) {
      const { lines, rowCovered, colCovered } = this.minLinesCover(cost);
      steps.push({
        iteration: iteration++,
        state: { lines, rowsCovered: rowCovered.filter(Boolean).length, colsCovered: colCovered.filter(Boolean).length, n },
        explanation:
          `Se tachan todos los ceros con el menor número posible de líneas (filas o columnas): ${lines}. ` +
          (lines >= n
            ? `Como son tantas líneas como filas tiene la matriz (${n}), ya se puede elegir un 0 en cada fila y columna: esa es la asignación óptima.`
            : `Como son menos que el tamaño de la matriz (${n}), todavía no se puede elegir un 0 en cada fila y columna: hay que ajustar.`),
        latex: rejilla([
          [[
            '\\text{Líneas}',
            `\\text{filas tachadas} + \\text{columnas tachadas} = ${rowCovered.filter(Boolean).length} + ${colCovered.filter(Boolean).length} = ${lines}`,
          ]],
          [[
            lines >= n
              ? `\\text{Comparación: } ${lines} = n = ${n} \\;\\Rightarrow\\; \\text{asignación óptima}`
              : `\\text{Comparación: } ${lines} < n = ${n} \\;\\Rightarrow\\; \\text{ajustar la matriz}`,
            '',
          ]],
        ]),
      });
      if (lines >= n) break;

      // Encontrar mínimo no cubierto, restarlo de no cubiertos y sumarlo a doblemente cubiertos
      let minUncovered = Number.POSITIVE_INFINITY;
      const libres: number[] = [];
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          if (!rowCovered[i] && !colCovered[j]) {
            if (cost[i][j] < M) libres.push(round(cost[i][j]));
            if (cost[i][j] < minUncovered) minUncovered = cost[i][j];
          }

      if (!Number.isFinite(minUncovered)) break;

      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (!rowCovered[i] && !colCovered[j]) cost[i][j] -= minUncovered;
          else if (rowCovered[i] && colCovered[j]) cost[i][j] += minUncovered;
        }
      steps.push({
        iteration: iteration++,
        state: { matrix: cost.map((r) => r.map((v) => round(v))).flat(), n, minUncovered: round(minUncovered) },
        explanation:
          `El menor valor que quedó sin tachar es δ = ${fmt(minUncovered)}. Se resta a todos los valores sin tachar ` +
          'para crear un nuevo 0, y se suma a los que están en el cruce de dos líneas; los tachados una sola vez no cambian.',
        latex:
          `\\delta = \\min(${libres.join(', ')}) = ${round(minUncovered)}` +
          `\\qquad \\text{sin tachar: } c_{ij} - ${round(minUncovered)}\\qquad \\text{en cruces: } c_{ij} + ${round(minUncovered)}`,
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
