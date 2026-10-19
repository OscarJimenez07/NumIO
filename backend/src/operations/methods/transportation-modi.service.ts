import { Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../../numerical/shared/step.types';
import { TransportationInputDto } from '../dto/transportation.dto';
import { TransportationVogelService } from './transportation-vogel.service';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num as fmt, paren, rejilla, trios } from '../../common/texto';

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

    // Base explícita: si Vogel agota fila y columna a la vez la solución inicial
    // queda degenerada (< m+n-1 celdas básicas) y el sistema u-v no se puede
    // resolver completo; se completa la base con celdas de asignación cero.
    const basic: boolean[][] = allocation.map((r) => r.map((x) => x > 0));
    this.repairBasis(basic, costs, m, n);

    for (let iter = 1; iter <= maxIter; iter++) {
      // Calcular u_i, v_j tales que u_i + v_j = c_ij para celdas básicas
      const u: (number | null)[] = Array(m).fill(null);
      const v: (number | null)[] = Array(n).fill(null);
      u[0] = 0;

      const basicCells: Array<[number, number]> = [];
      for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
          if (basic[i][j]) basicCells.push([i, j]);

      // Iterar hasta resolver todos los u y v. Se anota la cuenta de cada
      // potencial en el orden en que se despeja, para mostrarla.
      const cuentasPot: Array<[string, string]> = [['u_{1}', '0 \\;\\text{(se fija)}']];
      let changed = true;
      let safety = 0;
      while (changed && safety++ < 200) {
        changed = false;
        for (const [i, j] of basicCells) {
          if (u[i] !== null && v[j] === null) {
            v[j] = costs[i][j] - u[i]!;
            cuentasPot.push([`v_{${j + 1}}`, `c_{${i + 1}${j + 1}} - u_{${i + 1}} = ${round(costs[i][j])} - ${paren(u[i]!)} = ${round(v[j]!)}`]);
            changed = true;
          } else if (u[i] === null && v[j] !== null) {
            u[i] = costs[i][j] - v[j]!;
            cuentasPot.push([`u_{${i + 1}}`, `c_{${i + 1}${j + 1}} - v_{${j + 1}} = ${round(costs[i][j])} - ${paren(v[j]!)} = ${round(u[i]!)}`]);
            changed = true;
          }
        }
      }

      // Calcular costos reducidos para no básicas: r_ij = c_ij - u_i - v_j
      let bestI = -1, bestJ = -1, mostNegative = 0;
      const reduced: number[][] = Array.from({ length: m }, () => Array(n).fill(0));
      const cuentasRed: Array<[string, string]> = [];
      for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++) {
          if (!basic[i][j]) {
            if (u[i] !== null && v[j] !== null) {
              const r = costs[i][j] - u[i]! - v[j]!;
              reduced[i][j] = r;
              cuentasRed.push([`\\bar{c}_{${i + 1}${j + 1}}`, `${round(costs[i][j])} - ${paren(u[i]!)} - ${paren(v[j]!)} = ${round(r)}`]);
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
          explanation:
            `Con los potenciales ${potenciales(u, v)}, todas las celdas vacías tienen costo reducido mayor o igual a 0: ` +
            `ninguna ruta nueva abarata el envío, así que la solución es óptima. Costo total mínimo = ${fmt(total)}.`,
          latex: rejilla([
            ...trios(cuentasPot),
            ...trios(cuentasRed),
            [[`\\bar{c}_{ij} \\ge 0 \\text{ en todas las celdas vacías} \\;\\Rightarrow\\; \\text{óptimo}`, '']],
            [['Z', `${sumaCostos(allocation, costs)} = ${round(total)}`]],
          ]),
        });
        return {
          result: {
            allocation: allocation.map((r) => r.map((v) => round(v))),
            totalCost: round(total),
            iterations: iter - 1,
            u: u.map((x) => (x === null ? null : round(x))),
            v: v.map((x) => (x === null ? null : round(x))),
          },
          steps,
        };
      }

      // Encontrar ciclo cerrado y ajustar (algoritmo de stepping stone)
      const path = this.findCycle(basic, bestI, bestJ);
      if (!path) break;

      const minus = path.filter((_, k) => k % 2 === 1);
      const theta = Math.min(...minus.map(([i, j]) => allocation[i][j]));
      // Se guarda el estado antes del ajuste para poder explicarlo.
      const enviosResta = minus.map(([i, j]) => allocation[i][j]);
      const ui = u[bestI]!;
      const vj = v[bestJ]!;
      const cij = costs[bestI][bestJ];
      const celda = (i: number, j: number) => `F${i + 1} → D${j + 1}`;
      const ciclo = path.map(([i, j], k) => `${celda(i, j)} (${k % 2 === 0 ? '+' : '−'})`).join(', ');

      for (let k = 0; k < path.length; k++) {
        const [i, j] = path[k];
        allocation[i][j] += k % 2 === 0 ? theta : -theta;
      }

      // Actualizar la base: entra la celda con costo reducido negativo y sale
      // exactamente una de las celdas "-" que quedó en cero (las demás celdas
      // en cero permanecen básicas para conservar m+n-1 celdas).
      basic[bestI][bestJ] = true;
      let removed = false;
      for (const [i, j] of minus) {
        if (!removed && Math.abs(allocation[i][j]) < 1e-9) {
          allocation[i][j] = 0;
          basic[i][j] = false;
          removed = true;
        }
      }

      steps.push({
        iteration: steps.length + 1,
        state: {
          enteringCell: [bestI + 1, bestJ + 1] as any,
          theta,
          reducedCost: round(mostNegative),
          path: path.map(([i, j]) => `(${i + 1},${j + 1})`).join(' -> ') as any,
        },
        explanation:
          `Se calculan los potenciales con u_1 = 0 y u_i + v_j = costo en cada celda usada: ${potenciales(u, v)}. ` +
          `En cada celda vacía, costo reducido = costo − u_i − v_j. El más negativo es ${fmt(mostNegative)}, en ${celda(bestI, bestJ)}: ` +
          `cada unidad enviada por esa ruta abarata el total. Se forma el ciclo ${ciclo} ` +
          `y se mueven θ = ${fmt(theta)} unidades, el menor envío entre las celdas que restan (${enviosResta.map(fmt).join(', ')}). ` +
          `El costo total baja ${fmt(-mostNegative)} × ${fmt(theta)} = ${fmt(-mostNegative * theta)}.`,
        // Potenciales y costos reducidos de todas las celdas vacías (tres por
        // renglón); luego la celda que entra, θ y cuánto baja el costo.
        latex: rejilla([
          ...trios(cuentasPot),
          ...trios(cuentasRed),
          [[`\\text{Entra}`, `F_{${bestI + 1}} \\to D_{${bestJ + 1}} \\;\\text{(el más negativo: } ${round(cij)} - ${paren(ui)} - ${paren(vj)} = ${round(mostNegative)})`]],
          [
            ['\\theta', `\\min(${enviosResta.map(round).join(', ')}) = ${round(theta)}`],
            ['\\Delta Z', `${round(mostNegative)} \\times ${round(theta)} = ${round(mostNegative * theta)}`],
          ],
        ]),
      });
    }

    let total = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) total += allocation[i][j] * costs[i][j];

    return {
      result: { allocation: allocation.map((r) => r.map((v) => round(v))), totalCost: round(total), iterations: maxIter },
      steps,
      message: 'Se alcanzó el máximo de iteraciones.',
    };
  }

  /**
   * Completa la base a un árbol de expansión de m+n-1 celdas cuando la solución
   * inicial es degenerada: agrega la celda no básica más barata que una dos
   * componentes distintas (unión-búsqueda sobre filas y columnas), lo que
   * garantiza conectividad del sistema u-v sin crear ciclos.
   */
  private repairBasis(basic: boolean[][], costs: number[][], m: number, n: number): void {
    const parent = Array.from({ length: m + n }, (_, k) => k);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const union = (a: number, b: number): void => { parent[find(a)] = find(b); };

    let count = 0;
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        if (basic[i][j]) { union(i, m + j); count++; }

    while (count < m + n - 1) {
      let best: [number, number] | null = null;
      for (let i = 0; i < m; i++)
        for (let j = 0; j < n; j++)
          if (!basic[i][j] && find(i) !== find(m + j))
            if (!best || costs[i][j] < costs[best[0]][best[1]]) best = [i, j];
      if (!best) break;
      basic[best[0]][best[1]] = true;
      union(best[0], m + best[1]);
      count++;
    }
  }

  /** Encuentra ciclo cerrado para celda (sr,sc) usando celdas básicas + (sr,sc). */
  private findCycle(basic: boolean[][], sr: number, sc: number): Array<[number, number]> | null {
    const m = basic.length;
    const n = basic[0].length;
    const cells: Array<[number, number]> = [[sr, sc]];
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++)
        if (basic[i][j] && !(i === sr && j === sc)) cells.push([i, j]);

    // Búsqueda DFS de un ciclo que alterne fila/columna comenzando en (sr,sc).
    const path: Array<[number, number]> = [[sr, sc]];

    const dfs = (last: [number, number], horizontal: boolean): boolean => {
      const [r, c] = last;
      const candidates = cells.filter(([i, j]) => {
        // Todo movimiento (incluido el cierre del ciclo) debe respetar la
        // alternancia fila/columna con la celda anterior.
        if (horizontal ? i !== r : j !== c) return false;
        if (i === sr && j === sc) return path.length >= 4 && path.length % 2 === 0;
        return !path.some(([pi, pj]) => pi === i && pj === j);
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

  /**
   * Modo práctica: una fila por asignación de Vogel con la celda (fila F_i,
   * columna D_j), la cantidad enviada y el costo total acumulado hasta ese
   * paso; en la última fila es el costo de la solución inicial. Las
   * iteraciones MODI no se piden: su estado (ciclo, celda que entra) no es
   * numérico por paso.
   */
  validate(input: TransportationInputDto, userSteps: Step[]): FeedbackResult {
    const { costs, supply, demand } = input;
    const pasos = this.vogel.buildInitial(costs, supply, demand).steps;
    let acumulado = 0;
    const expected: Step[] = pasos.map((p, k) => {
      acumulado += p.state.contribution as number;
      return {
        iteration: k + 1,
        state: {
          fila: p.state.row as number,
          columna: p.state.col as number,
          cantidad: p.state.quantity as number,
          costoAcumulado: round(acumulado),
        },
      };
    });
    return this.feedback.compare(expected, userSteps);
  }
}

/** Costo total como suma de costo × cantidad de cada ruta usada: 2(5) + 11(10) + ... */
function sumaCostos(allocation: number[][], costs: number[][]): string {
  const terminos: string[] = [];
  allocation.forEach((fila, i) =>
    fila.forEach((x, j) => {
      if (x > 1e-9) terminos.push(`${round(costs[i][j])}(${round(x)})`);
    }),
  );
  return terminos.join(' + ');
}

/** «u = (0, 5, 7) y v = (−3, 2, 4, 11)» para las frases. */
function potenciales(u: (number | null)[], v: (number | null)[]): string {
  const lista = (xs: (number | null)[]) => xs.map((x) => (x === null ? '?' : fmt(x))).join(', ');
  return `u = (${lista(u)}) y v = (${lista(v)})`;
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  return Math.round(x * k) / k;
}
