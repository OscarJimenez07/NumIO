import { BadRequestException, Injectable } from '@nestjs/common';
import { SolveResult, Step } from '../../numerical/shared/step.types';
import { SimplexInputDto, SimplexObjective } from '../dto/simplex.dto';
import { FeedbackService } from '../../feedback/feedback.service';
import { FeedbackResult } from '../../feedback/feedback.types';
import { num as fmt, pares, paren, rejilla } from '../../common/texto';

const EPS = 1e-9;
const MAX_ITER = 100;

/** Una restricción ya normalizada: lado derecho no negativo. */
interface Fila {
  coefs: number[];
  operator: '<=' | '>=' | '=';
  rhs: number;
}

@Injectable()
export class SimplexService {
  constructor(private readonly feedback: FeedbackService) {}

  /**
   * Símplex tabular con el método de las dos fases.
   *
   * Cada restricción se lleva a igualdad: «≤» suma una holgura s_i; «≥» resta
   * un excedente e_i y suma una artificial a_i; «=» suma una artificial a_i.
   * Un lado derecho negativo se multiplica antes por −1 (invirtiendo «≤»/«≥»).
   * Si hay artificiales, la fase 1 minimiza W = Σ a_i: si W > 0 en el óptimo el
   * problema es infactible; si no, las artificiales se retiran y la fase 2
   * optimiza la función objetivo original desde esa base factible. Se prefiere
   * a la gran M porque las tablas conservan números legibles para el estudiante.
   */
  solve(input: SimplexInputDto): SolveResult {
    const { c, constraints, objective } = input;
    if (!c || c.length === 0) throw new BadRequestException('Se requieren coeficientes c.');
    if (!constraints || constraints.length === 0) {
      throw new BadRequestException('Se requiere al menos una restricción.');
    }
    const n = c.length;
    const filas: Fila[] = constraints.map((ct) => {
      if (ct.coefficients.length !== n) {
        throw new BadRequestException('Cada restricción debe tener el mismo número de coeficientes que c.');
      }
      if (ct.rhs < 0) {
        const operator = ct.operator === '<=' ? '>=' : ct.operator === '>=' ? '<=' : '=';
        return { coefs: ct.coefficients.map((v) => -v), operator, rhs: -ct.rhs };
      }
      return { coefs: [...ct.coefficients], operator: ct.operator, rhs: ct.rhs };
    });
    const m = filas.length;

    // ---- Columnas: x_j, luego holgura/excedente por restricción, luego artificiales.
    const nombres: string[] = c.map((_, j) => `x${j + 1}`);
    const colHolgura: (number | null)[] = [];
    filas.forEach((f, i) => {
      if (f.operator === '=') return colHolgura.push(null);
      colHolgura.push(nombres.length);
      nombres.push(f.operator === '<=' ? `s${i + 1}` : `e${i + 1}`);
    });
    const colArtificial: (number | null)[] = [];
    filas.forEach((f, i) => {
      if (f.operator === '<=') return colArtificial.push(null);
      colArtificial.push(nombres.length);
      nombres.push(`a${i + 1}`);
    });
    const artificiales = colArtificial.filter((j): j is number => j !== null);

    let cols = nombres.length + 1; // + lado derecho
    const tabla: number[][] = filas.map((f, i) => {
      const fila = Array(cols).fill(0);
      f.coefs.forEach((v, j) => (fila[j] = v));
      const h = colHolgura[i];
      if (h !== null) fila[h] = f.operator === '<=' ? 1 : -1;
      const a = colArtificial[i];
      if (a !== null) fila[a] = 1;
      fila[cols - 1] = f.rhs;
      return fila;
    });
    const base: number[] = filas.map((f, i) => (f.operator === '<=' ? colHolgura[i]! : colArtificial[i]!));

    const pasos: Step[] = [];
    const signoZ = objective === SimplexObjective.MAX ? 1 : -1;
    const conArtificiales = artificiales.length > 0;

    // La fila objetivo siempre se maximiza: max Z = c·x usa −c; min Z = c·x
    // equivale a max −Z y usa +c. La celda del lado derecho guarda el valor
    // maximizado, de ahí que Z = signoZ · celda.
    const filaObjetivo = (): number[] => {
      const z = Array(cols).fill(0);
      c.forEach((v, j) => (z[j] = objective === SimplexObjective.MAX ? -v : v));
      return z;
    };

    // ------------------------------------------------------------ Fase 1
    if (conArtificiales) {
      // max −W = −Σ a_i  →  coeficiente +1 en cada artificial; se hace canónica
      // restando las filas cuya variable básica es artificial.
      const w = Array(cols).fill(0);
      artificiales.forEach((j) => (w[j] = 1));
      base.forEach((b, i) => {
        if (artificiales.includes(b)) for (let j = 0; j < cols; j++) w[j] -= tabla[i][j];
      });
      tabla.push(w);

      this.registrar(pasos, tabla, base, nombres, 1, {
        explanation:
          'Fase 1, tabla inicial: las restricciones «≥» y «=» no tienen una holgura que sirva de base, así que se les agrega ' +
          'una variable artificial (a). Primero se busca llevar W, la suma de las artificiales, a 0: si se logra, ' +
          'existe una solución que cumple todas las restricciones.',
        latex: `\\min W = ${artificiales.map((j) => latexVar(nombres[j])).join(' + ')}`,
        valor: (cel) => -cel,
      });

      // W = suma de las artificiales con su valor actual: a_1 + a_2 = 3 + 0.
      const sustW = () =>
        artificiales
          .map((j, k) => {
            const v = valorVariable(tabla, base, j);
            return k === 0 ? String(round(v)) : paren(v);
          })
          .join(' + ');
      const r1 = this.iterar(tabla, base, nombres, pasos, 1, (cel) => -cel, 'W', sustW);
      if (r1 === 'no-acotado') {
        // La fase 1 siempre está acotada (W ≥ 0); se deja por robustez.
        return this.noAcotado(pasos);
      }
      const W = -tabla[m][cols - 1];
      if (W > 1e-7) {
        return {
          result: { infeasible: true, iterations: pasos.length - 1 },
          steps: pasos,
          message: `Problema infactible: la fase 1 termina con W = ${round(W)} > 0, ninguna solución cumple todas las restricciones.`,
        };
      }

      // Retirar artificiales que quedaron básicas en nivel cero.
      for (let i = 0; i < base.length; i++) {
        if (!artificiales.includes(base[i])) continue;
        const j = tabla[i].findIndex((v, k) => k < cols - 1 && !artificiales.includes(k) && Math.abs(v) > EPS);
        if (j >= 0) {
          pivotear(tabla, i, j);
          base[i] = j;
        }
      }
      // Filas redundantes (artificial básica sin pivote posible) se eliminan.
      for (let i = base.length - 1; i >= 0; i--) {
        if (artificiales.includes(base[i])) {
          tabla.splice(i, 1);
          base.splice(i, 1);
        }
      }
      // Quitar columnas artificiales y la fila W.
      tabla.pop();
      const quitar = new Set(artificiales);
      // Índice nuevo de cada columna que sobrevive.
      const mapa: number[] = [];
      let siguiente = 0;
      nombres.forEach((_, j) => {
        if (!quitar.has(j)) mapa[j] = siguiente++;
      });
      for (let i = 0; i < tabla.length; i++) tabla[i] = tabla[i].filter((_, j) => j === cols - 1 || !quitar.has(j));
      for (let i = 0; i < base.length; i++) base[i] = mapa[base[i]];
      for (let j = nombres.length - 1; j >= 0; j--) if (quitar.has(j)) nombres.splice(j, 1);
      cols = nombres.length + 1;
    }

    // ------------------------------------------------------------ Fase 2
    const z = filaObjetivo();
    base.forEach((b, i) => {
      const f = z[b];
      if (Math.abs(f) > EPS) for (let j = 0; j < cols; j++) z[j] -= f * tabla[i][j];
    });
    tabla.push(z);

    this.registrar(pasos, tabla, base, nombres, conArtificiales ? 2 : undefined, {
      explanation: conArtificiales
        ? 'Fase 2, tabla inicial: como W llegó a 0, ya hay una solución que cumple todas las restricciones. ' +
          'Se quitan las variables artificiales y se vuelve a la función objetivo original, escrita en términos de la base encontrada.'
        : 'Tabla inicial: a cada restricción «≤» se le suma una variable de holgura (s_1, s_2, …), que es la que falta para ' +
          'llegar al límite. Las holguras forman la base de arranque: todas las x valen 0 y por eso Z empieza en 0.',
      latex: conArtificiales
        ? `${objective === SimplexObjective.MAX ? '\\max' : '\\min'} Z = ${c.map((v, j) => `${v}x_{${j + 1}}`).join(' + ').replace(/\+ -/g, '- ')}`
        : `\\text{Restricciones: } \\sum_j a_{ij}x_j + s_i = b_i, \\quad s_i \\ge 0`,
      valor: (cel) => signoZ * cel,
    });

    // Z = c_1 x_1 + c_2 x_2 + ... con el valor actual de cada x: 3(2) + 5(6).
    const sustZ = () =>
      c.map((cj, j) => `${j === 0 ? round(cj) : paren(cj)}(${round(valorVariable(tabla, base, j))})`).join(' + ');
    const r2 = this.iterar(tabla, base, nombres, pasos, conArtificiales ? 2 : undefined, (cel) => signoZ * cel, 'Z', sustZ);
    if (r2 === 'no-acotado') return this.noAcotado(pasos);

    // ------------------------------------------------------------ Solución
    const x = Array(n).fill(0);
    base.forEach((b, i) => {
      if (b < n) x[b] = round(tabla[i][cols - 1]);
    });
    const filaZ = tabla[tabla.length - 1];
    return {
      result: {
        x,
        z: round(signoZ * filaZ[cols - 1]),
        iterations: pasos.length - 1,
        basis: [...base],
        varNames: [...nombres],
        phases: conArtificiales ? 2 : 1,
      },
      steps: pasos,
      plotData: undefined,
    };
  }

  /** Pivotea hasta el óptimo de la fila objetivo (la última). */
  private iterar(
    tabla: number[][],
    base: number[],
    nombres: string[],
    pasos: Step[],
    fase: number | undefined,
    valor: (celda: number) => number,
    etiqueta: 'Z' | 'W',
    sustitucion: () => string,
  ): 'optimo' | 'no-acotado' {
    const cols = tabla[0].length;
    const filaObj = tabla.length - 1;
    for (let k = 0; k < MAX_ITER; k++) {
      // Entra la columna más negativa de la fila objetivo (empate: la de menor índice).
      let col = -1;
      let menor = -EPS;
      for (let j = 0; j < cols - 1; j++) {
        if (tabla[filaObj][j] < menor) {
          menor = tabla[filaObj][j];
          col = j;
        }
      }
      if (col === -1) return 'optimo';

      // Sale la fila del menor cociente b_i / a_ij con a_ij > 0. Se guardan
      // todos los cocientes para mostrarlos: así se ve por qué sale esa fila.
      let fila = -1;
      let menorCociente = Number.POSITIVE_INFINITY;
      const cocientes: { variable: string; b: number; a: number; q: number }[] = [];
      for (let i = 0; i < filaObj; i++) {
        if (tabla[i][col] > EPS) {
          const q = tabla[i][cols - 1] / tabla[i][col];
          cocientes.push({ variable: nombres[base[i]], b: tabla[i][cols - 1], a: tabla[i][col], q });
          if (q < menorCociente - EPS) {
            menorCociente = q;
            fila = i;
          }
        }
      }
      if (fila === -1) return 'no-acotado';

      const pivote = tabla[fila][col];
      const sale = nombres[base[fila]];
      // Operación de cada fila del pivoteo, antes de aplicarlo: así se ve de
      // dónde sale cada número de la tabla nueva.
      const nombreFila = (i: number) => (i === filaObj ? etiqueta : latexVar(nombres[base[i]]));
      const opsFilas: Array<[string, string]> = [];
      opsFilas.push([`F_{${latexVar(nombres[col])}}`, `F_{${latexVar(sale)}} \\div ${round(pivote)}\\;\\text{(nueva fila pivote)}`]);
      for (let i = 0; i < tabla.length; i++) {
        if (i === fila) continue;
        const factor = round(tabla[i][col]);
        opsFilas.push([
          `F_{${nombreFila(i)}}`,
          factor === 0
            ? '\\text{no cambia (ya tiene 0)}'
            : `F_{${nombreFila(i)}} ${factor < 0 ? '+' : '-'} ${Math.abs(factor) === 1 ? '' : Math.abs(factor)}\\,F_{${latexVar(nombres[col])}}`,
        ]);
      }
      pivotear(tabla, fila, col);
      base[fila] = col;
      const v = round(valor(tabla[filaObj][cols - 1]));
      const entra = nombres[col];
      const listaCocientes = cocientes
        .map((c) => `${varTxt(c.variable)}: ${fmt(c.b)} ÷ ${fmt(c.a)} = ${fmt(c.q)}`)
        .join('; ');
      this.registrar(pasos, tabla, base, nombres, fase, {
        pivotRow: fila,
        pivotCol: col,
        explanation:
          `${fase ? `Fase ${fase}. ` : ''}Entra ${varTxt(entra)} a la base porque tiene el coeficiente más negativo ` +
          `de la fila ${etiqueta} (${fmt(menor)}): es la variable que más mejora el objetivo. ` +
          `Para decidir cuál sale, se divide el lado derecho entre la columna de ${varTxt(entra)}, solo donde es positiva: ` +
          `${listaCocientes}. El menor cociente es ${fmt(menorCociente)}, así que sale ${varTxt(sale)} y el pivote es ${fmt(pivote)}. ` +
          `Después de pivotear, ${etiqueta} = ${fmt(v)}.`,
        // Quién entra, cocientes de cada fila, operación de cada fila y el
        // nuevo valor del objetivo.
        latex: rejilla([
          [
            ['\\text{Entra}', `${latexVar(entra)} \\;\\text{(coeficiente }{${round(menor)}}\\text{)}`],
            ['\\text{Sale}', `${latexVar(sale)} \\;\\text{(menor cociente)}`],
          ],
          ...pares(
            cocientes.map((c): [string, string] => [
              `\\text{Cociente } ${latexVar(c.variable)}`,
              `\\frac{${round(c.b)}}{${round(c.a)}} = ${round(c.q)}`,
            ]),
          ),
          ...pares(opsFilas),
          [[etiqueta, `${sustitucion()} = ${v}`]],
        ]),
        valor,
      });
    }
    return 'optimo';
  }

  private registrar(
    pasos: Step[],
    tabla: number[][],
    base: number[],
    nombres: string[],
    fase: number | undefined,
    extra: { explanation: string; latex: string; valor: (celda: number) => number; pivotRow?: number; pivotCol?: number },
  ) {
    const cols = tabla[0].length;
    const objetivo = tabla[tabla.length - 1][cols - 1];
    pasos.push({
      iteration: pasos.length,
      state: {
        tableau: tabla.map((r) => r.map((v) => round(v))).flat(),
        rows: tabla.length,
        cols,
        basis: [...base],
        varNames: [...nombres],
        ...(fase ? { phase: fase } : {}),
        ...(extra.pivotRow !== undefined ? { pivotRow: extra.pivotRow, pivotCol: extra.pivotCol } : {}),
        z: round(extra.valor(objetivo)),
      },
      explanation: extra.explanation,
      latex: extra.latex,
    });
  }

  private noAcotado(pasos: Step[]): SolveResult {
    return {
      result: { unbounded: true, iterations: pasos.length - 1 },
      steps: pasos,
      message: 'Problema no acotado: no existe solución óptima finita.',
    };
  }

  /**
   * Modo práctica: una fila por pivoteo (incluidos los de la fase 1) con la
   * variable que entra, la que sale, el elemento pivote (antes de dividir) y
   * el valor del objetivo tras pivotear (W en la fase 1, Z en la fase 2). Se
   * derivan de la tabla anterior a cada pivoteo, sin recalcular el algoritmo.
   */
  validate(input: SimplexInputDto, userSteps: Step[]): FeedbackResult {
    const pasos = this.solve(input).steps;
    const expected: Step[] = [];
    for (let k = 1; k < pasos.length; k++) {
      const s = pasos[k].state;
      if (s.pivotRow === undefined) continue;
      const antes = pasos[k - 1].state;
      const fila = s.pivotRow as number;
      const col = s.pivotCol as number;
      const nombres = antes.varNames as string[];
      expected.push({
        iteration: expected.length + 1,
        state: {
          entra: nombres[col],
          sale: nombres[(antes.basis as number[])[fila]],
          pivote: (antes.tableau as number[])[fila * (antes.cols as number) + col],
          z: s.z,
        },
      });
    }
    // «X_1», «x₁» o «x 1» se aceptan como x1.
    const usuario = (userSteps ?? []).map((u) => ({
      ...u,
      state: Object.fromEntries(
        Object.entries(u.state ?? {}).map(([k, v]) => [k, typeof v === 'string' ? normalizarVariable(v) : v]),
      ),
    }));
    return this.feedback.compare(expected, usuario);
  }
}

/** Escribe un nombre de variable como lo usa el tablero: «X_{1}», «x₁» → «x1». */
function normalizarVariable(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[\s_{}]/g, '');
}

function pivotear(tabla: number[][], fila: number, col: number) {
  const cols = tabla[0].length;
  const p = tabla[fila][col];
  for (let j = 0; j < cols; j++) tabla[fila][j] /= p;
  for (let i = 0; i < tabla.length; i++) {
    if (i === fila) continue;
    const f = tabla[i][col];
    if (Math.abs(f) > EPS) for (let j = 0; j < cols; j++) tabla[i][j] -= f * tabla[fila][j];
  }
}

/** x1 → x_{1}, s2 → s_{2} */
function latexVar(nombre: string): string {
  return `${nombre[0]}_{${nombre.slice(1)}}`;
}

/** Valor actual de la variable de la columna j: su lado derecho si es básica, 0 si no. */
function valorVariable(tabla: number[][], base: number[], j: number): number {
  const fila = base.indexOf(j);
  return fila === -1 ? 0 : tabla[fila][tabla[0].length - 1];
}

/** x1 → x_1 en las frases (el frontend lo muestra como x₁). */
function varTxt(nombre: string): string {
  return `${nombre[0]}_${nombre.slice(1)}`;
}

function round(x: number, d = 6): number {
  const k = Math.pow(10, d);
  const v = Math.round(x * k) / k;
  return Object.is(v, -0) ? 0 : v;
}
