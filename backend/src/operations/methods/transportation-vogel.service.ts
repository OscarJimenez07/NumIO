import { BadRequestException, Injectable } from '@nestjs/common';
import { Step } from '../../numerical/shared/step.types';
import { num as fmt, paren, rejilla, trios } from '../../common/texto';

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
      // La cuenta de cada penalización, para mostrarlas todas: P(O1) = 10 - 2 = 8.
      const cuentasPen: Array<[string, string]> = [];
      const cuentaPen = (vals: number[], pen: number) =>
        vals.length === 1 ? `${round(vals[0])} \\;\\text{(un solo costo)}` : `${round(vals[1])} - ${paren(vals[0])} = ${round(pen)}`;

      for (let i = 0; i < m; i++) {
        if (rowDone[i]) continue;
        const vals: number[] = [];
        for (let j = 0; j < n; j++) if (!colDone[j]) vals.push(costs[i][j]);
        if (vals.length === 0) continue;
        vals.sort((a, b) => a - b);
        rowPenalty[i] = vals.length === 1 ? vals[0] : vals[1] - vals[0];
        cuentasPen.push([`P(O_{${i + 1}})`, cuentaPen(vals, rowPenalty[i])]);
      }
      for (let j = 0; j < n; j++) {
        if (colDone[j]) continue;
        const vals: number[] = [];
        for (let i = 0; i < m; i++) if (!rowDone[i]) vals.push(costs[i][j]);
        if (vals.length === 0) continue;
        vals.sort((a, b) => a - b);
        colPenalty[j] = vals.length === 1 ? vals[0] : vals[1] - vals[0];
        cuentasPen.push([`P(D_{${j + 1}})`, cuentaPen(vals, colPenalty[j])]);
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

      // Los dos costos más bajos de la línea elegida, para mostrar de dónde
      // sale la penalización.
      const linea = isRow
        ? costs[idx].filter((_, j) => !colDone[j])
        : costs.map((r) => r[idx]).filter((_, i) => !rowDone[i]);
      const [bajo1, bajo2] = [...linea].sort((a, b) => a - b);
      const nombreLinea = isRow ? `la fila O${idx + 1}` : `la columna D${idx + 1}`;
      const origenPen =
        bajo2 === undefined
          ? `solo le queda un costo disponible, ${fmt(bajo1)}`
          : `sus dos costos más bajos son ${fmt(bajo1)} y ${fmt(bajo2)}`;
      const ofertaAntes = s[pickI];
      const demandaAntes = d[pickJ];

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
        explanation:
          `La penalización de cada fila y columna es la diferencia entre sus dos costos más bajos ` +
          `(lo que se pierde si no se usa la ruta más barata). La mayor es ${fmt(maxPen)}, en ${nombreLinea}: ${origenPen}. ` +
          `Ahí la ruta más barata es O${pickI + 1} → D${pickJ + 1}, con costo ${fmt(costs[pickI][pickJ])}. ` +
          `Se envía lo máximo posible: el menor entre la oferta que queda (${fmt(ofertaAntes)}) y la demanda que falta (${fmt(demandaAntes)}), ` +
          `es decir ${fmt(qty)} unidades, que cuestan ${fmt(qty)} × ${fmt(costs[pickI][pickJ])} = ${fmt(qty * costs[pickI][pickJ])}.`,
        // Todas las penalizaciones (tres por renglón), luego la asignación con
        // su costo y lo que queda de oferta y demanda.
        latex: rejilla([
          ...trios(cuentasPen),
          [[`\\text{Mayor penalización}`, `${round(maxPen)} \\;\\text{en } ${isRow ? `O_{${idx + 1}}` : `D_{${idx + 1}}`} \\;\\Rightarrow\\; \\text{ruta más barata } O_{${pickI + 1}} \\to D_{${pickJ + 1}}`]],
          [
            [`x_{${pickI + 1}${pickJ + 1}}`, `\\min(${ofertaAntes}, ${demandaAntes}) = ${qty}`],
            [`\\text{Costo}`, `${qty} \\times ${costs[pickI][pickJ]} = ${round(qty * costs[pickI][pickJ])}`],
          ],
          [
            [`\\text{Oferta } O_{${pickI + 1}}`, `${ofertaAntes} - ${qty} = ${s[pickI]}`],
            [`\\text{Demanda } D_{${pickJ + 1}}`, `${demandaAntes} - ${qty} = ${d[pickJ]}`],
          ],
        ]),
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
