import { Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../../numerical/shared/step.types';
import { TransportationInputDto } from '../dto/transportation.dto';
import { TransportationVogelService } from './transportation-vogel.service';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';

@Injectable()
export class TransportationModiService {
  constructor(
    private readonly vogel: TransportationVogelService,
    private readonly feedback: FeedbackService,
  ) {}

  solve(input: TransportationInputDto): SolveResult {
    const { costs, supply, demand } = input;
    const initial = this.vogel.buildInitial(costs, supply, demand);
    const m = supply.length;
    const n = demand.length;
    let allocation = initial.allocation.map((r) => [...r]);
    const steps: Step[] = [...initial.steps];
    const maxIter = 50;

    for (let iter = 1; iter <= maxIter; iter++) {
      // Calcular u_i, v_j tales que u_i + v_j = c_ij para celdas básicas
      const u: (number | null)[] = Array(m).fill(null);
      const v: (number | null)[] = Array(n).fill(null);
      u[0] = 0;

      const basicCells: Array<[number, number]> = [];
      for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
          if (allocation[i][j] > 0) basicCells.push([i, j]);

      // Iterar hasta resolver todos los u y v
      let changed = true;
      let safety = 0;
      while (changed && safety++ < 200) {
        changed = false;
        for (const [i, j] of basicCells) {
          if (u[i] !== null && v[j] === null) { v[j] = costs[i][j] - u[i]!; changed = true; }
          else if (u[i] === null && v[j] !== null) { u[i] = costs[i][j] - v[j]!; changed = true; }
        }
      }

      // Calcular costos reducidos para no básicas: r_ij = c_ij - u_i - v_j
      let bestI = -1, bestJ = -1, mostNegative = 0;
      const reduced: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
      for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++) {
          if (allocation[i][j] === 0) {
            if (u[i] !== null && v[j] !== null) {
              const r = costs[i][j] - u[i]! - v[j]!;
              reduced[i][j] = r;
              if (r < mostNegative - 1e-9) { mostNegative = r; bestI = i; bestJ = j; }
            }
          }
        }

      if (bestI === -1) {
        // Óptimo
        let total = 0;
        for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) total += allocation[i][j] * costs[i][j];
        steps.push({
          iteration: steps.length + 1,
          state: { totalCost: round(total), optimal: 1 },
          explanation: 'No hay costos reducidos negativos. Solución óptima alcanzada.',
        });
        return {
          result: {
            allocation: allocation.map((r) => r.map(round)),
            totalCost: round(total),
            iterations: iter - 1,
            u: u.map((x) => (x === null ? null : round(x))),
            v: v.map((x) => (x === null ? null : round(x))),
          },
          steps,
        };
      }

      // Encontrar ciclo cerrado y ajustar (algoritmo de stepping stone)
      const path = this.findCycle(allocation, bestI, bestJ);
      if (!path) break;

      const minus = path.filter((_, k) => k % 2 === 1);
      const theta = Math.min(...minus.map(([i, j]) => allocation[i][j]));

      for (let k = 0; k < path.length; k++) {
        const [i, j] = path[k];
        allocation[i][j] += k % 2 === 0 ? theta : -theta;
      }

      steps.push({
        iteration: steps.length + 1,
        state: {
          enteringCell: [bestI + 1, bestJ + 1] as any,
          theta,
          reducedCost: round(mostNegative),
          path: path.map(([i, j]) => `(${i + 1},${j + 1})`).join(' -> ') as any,
        },
        explanation: `MODI: celda entrante (${bestI + 1},${bestJ + 1}) con costo reducido ${round(mostNegative)}. Ajuste θ=${theta}.`,
      });
    }

    let total = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) total += allocation[i][j] * costs[i][j];

    return {
      result: { allocation: allocation.map((r) => r.map(round)), totalCost: round(total), iterations: maxIter },
      steps,
      message: 'Se alcanzó el máximo de iteraciones.',
    };
  }

  /** Encuentra ciclo cerrado para celda (sr,sc) usando celdas básicas + (sr,sc). */
  private findCycle(allocation: number[][], sr: number, sc: number): Array<[number, number]> | null {
    const m = allocation.length;
    const n = allocation[0].length;
    const cells: Array<[number, number]> = [[sr, sc]];
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        if (allocation[i][j] > 0 && !(i === sr && j === sc)) cells.push([i, j]);

    // Búsqueda DFS de un ciclo que alterne fila/columna comenzando en (sr,sc).
    const path: Array<[number, number]> = [[sr, sc]];

    const dfs = (last: [number, number], horizontal: boolean): boolean => {
      const [r, c] = last;
      const candidates = cells.filter(([i, j]) => {
        if (i === sr && j === sc && path.length >= 4 && path.length % 2 === 0) return true;
        if (path.some(([pi, pj]) => pi === i && pj === j)) return false;
        return horizontal ? i === r : j === c;
      });
      for (const cand of candidates) {
        if (cand[0] === sr && cand[1] === sc) return true;
        path.push(cand);
        if (dfs(cand, !horizontal)) return true;
        path.pop();
      }
      return false;
    };

    if (dfs([sr, sc], true) || dfs([sr, sc], false)) return path;
    return null;
  }

  validate(input: TransportationInputDto, userSteps: Step[]): FeedbackResult {
    const expected = this.solve(input).steps;
    return this.feedback.compare(expected, userSteps);
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
