import { BadRequestException, Injectable } from '@nestjs/common';
import { Step } from '../../numerical/shared/step.types';

export interface VogelResult {
  allocation: number[][];
  totalCost: number;
  steps: Step[];
}

@Injectable()
export class TransportationVogelService {
  /**
   * Aproximación de Vogel: solución básica inicial para el problema de transporte.
   * Si oferta ≠ demanda, el caller debe balancear antes (se valida acá).
   */
  buildInitial(costs: number[][], supply: number[], demand: number[]): VogelResult {
    const m = supply.length;
    const n = demand.length;
    if (costs.length !== m || costs.some((row) => row.length !== n)) {
      throw new BadRequestException('La matriz de costos debe ser de tamaño oferta x demanda.');
    }
    const totalSupply = supply.reduce((a, b) => a + b, 0);
    const totalDemand = demand.reduce((a, b) => a + b, 0);
    if (Math.abs(totalSupply - totalDemand) > 1e-9) {
      throw new BadRequestException(
        `Problema no balanceado: oferta total = ${totalSupply}, demanda total = ${totalDemand}.`,
      );
    }

    const s = [...supply];
    const d = [...demand];
    const allocation: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
    const rowDone = Array(m).fill(false);
    const colDone = Array(n).fill(false);
    const steps: Step[] = [];
    let iter = 0;

    while (rowDone.filter(Boolean).length < m && colDone.filter(Boolean).length < n) {
      iter++;
      // Calcular penalizaciones por fila y columna (diferencia entre los 2 menores)
      const rowPenalty: number[] = Array(m).fill(-1);
      const colPenalty: number[] = Array(n).fill(-1);

      for (let i = 0; i < m; i++) {
        if (rowDone[i]) continue;
        const vals: number[] = [];
        for (let j = 0; j < n; j++) if (!colDone[j]) vals.push(costs[i][j]);
        if (vals.length === 0) continue;
        vals.sort((a, b) => a - b);
        rowPenalty[i] = vals.length === 1 ? vals[0] : vals[1] - vals[0];
      }
      for (let j = 0; j < n; j++) {
        if (colDone[j]) continue;
        const vals: number[] = [];
        for (let i = 0; i < m; i++) if (!rowDone[i]) vals.push(costs[i][j]);
        if (vals.length === 0) continue;
        vals.sort((a, b) => a - b);
        colPenalty[j] = vals.length === 1 ? vals[0] : vals[1] - vals[0];
      }

      // Encontrar máxima penalización
      let maxPen = -1;
      let isRow = true;
      let idx = -1;
      for (let i = 0; i < m; i++) {
        if (rowPenalty[i] > maxPen) {
          maxPen = rowPenalty[i];
          isRow = true;
          idx = i;
        }
      }
      for (let j = 0; j < n; j++) {
        if (colPenalty[j] > maxPen) {
          maxPen = colPenalty[j];
          isRow = false;
          idx = j;
        }
      }

      // Encontrar la celda de menor costo en esa fila/columna
      let pickI = -1;
      let pickJ = -1;
      let minCost = Number.POSITIVE_INFINITY;
      if (isRow) {
        for (let j = 0; j < n; j++) {
          if (!colDone[j] && costs[idx][j] < minCost) {
            minCost = costs[idx][j];
            pickI = idx;
            pickJ = j;
          }
        }
      } else {
        for (let i = 0; i < m; i++) {
          if (!rowDone[i] && costs[i][idx] < minCost) {
            minCost = costs[i][idx];
            pickI = i;
            pickJ = idx;
          }
        }
      }

      const qty = Math.min(s[pickI], d[pickJ]);
      allocation[pickI][pickJ] = qty;
      s[pickI] -= qty;
      d[pickJ] -= qty;
      if (s[pickI] === 0) rowDone[pickI] = true;
      if (d[pickJ] === 0) colDone[pickJ] = true;

      steps.push({
        iteration: iter,
        state: {
          row: pickI + 1,
          col: pickJ + 1,
          quantity: qty,
          cost: costs[pickI][pickJ],
          contribution: round(qty * costs[pickI][pickJ]),
          remainingSupply: [...s],
          remainingDemand: [...d],
        },
        explanation: `Vogel: máxima penalización ${maxPen} en ${isRow ? 'fila' : 'columna'} ${idx + 1}. Asignar ${qty} a celda (${pickI + 1},${pickJ + 1}) con costo ${costs[pickI][pickJ]}.`,
      });
    }

    let total = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) total += allocation[i][j] * costs[i][j];

    return { allocation, totalCost: round(total), steps };
  }
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
