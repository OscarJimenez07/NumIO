import { SimplexService } from './simplex.service';
import { FeedbackService } from '../../feedback/feedback.service';
import { SimplexObjective } from '../dto/simplex.dto';

describe('SimplexService', () => {
  const service = new SimplexService(new FeedbackService());

  it('Hillier & Lieberman cap. 4 — max 3x1 + 5x2 s.a x1<=4, 2x2<=12, 3x1+2x2<=18 → Z=36 (x1=2,x2=6)', () => {
    const out = service.solve({
      objective: SimplexObjective.MAX,
      c: [3, 5],
      constraints: [
        { coefficients: [1, 0], operator: '<=', rhs: 4 },
        { coefficients: [0, 2], operator: '<=', rhs: 12 },
        { coefficients: [3, 2], operator: '<=', rhs: 18 },
      ],
    });
    expect(out.result.z).toBeCloseTo(36, 4);
    expect(out.result.x[0]).toBeCloseTo(2, 4);
    expect(out.result.x[1]).toBeCloseTo(6, 4);
  });

  it('Minimización: min -3x1 - 5x2 con las mismas restricciones → Z=-36 (signo correcto)', () => {
    const out = service.solve({
      objective: SimplexObjective.MIN,
      c: [-3, -5],
      constraints: [
        { coefficients: [1, 0], operator: '<=', rhs: 4 },
        { coefficients: [0, 2], operator: '<=', rhs: 12 },
        { coefficients: [3, 2], operator: '<=', rhs: 18 },
      ],
    });
    expect(out.result.z).toBeCloseTo(-36, 4);
    expect(out.result.x[0]).toBeCloseTo(2, 4);
    expect(out.result.x[1]).toBeCloseTo(6, 4);
  });

  it('Hillier & Lieberman cap. 4 (terapia de radiación) — min con «≤», «=» y «≥» → Z=5.25 en (7.5, 4.5)', () => {
    const out = service.solve({
      objective: SimplexObjective.MIN,
      c: [0.4, 0.5],
      constraints: [
        { coefficients: [0.3, 0.1], operator: '<=', rhs: 2.7 },
        { coefficients: [0.5, 0.5], operator: '=', rhs: 6 },
        { coefficients: [0.6, 0.4], operator: '>=', rhs: 6 },
      ],
    });
    expect(out.result.z).toBeCloseTo(5.25, 4);
    expect(out.result.x[0]).toBeCloseTo(7.5, 4);
    expect(out.result.x[1]).toBeCloseTo(4.5, 4);
    expect(out.result.phases).toBe(2);
    expect(out.steps.some((s) => s.state.phase === 1)).toBe(true);
  });

  it('Taha cap. 3 (dos fases) — min 4x1 + x2 → Z=3.4 en (0.4, 1.8)', () => {
    const out = service.solve({
      objective: SimplexObjective.MIN,
      c: [4, 1],
      constraints: [
        { coefficients: [3, 1], operator: '=', rhs: 3 },
        { coefficients: [4, 3], operator: '>=', rhs: 6 },
        { coefficients: [1, 2], operator: '<=', rhs: 4 },
      ],
    });
    expect(out.result.z).toBeCloseTo(3.4, 4);
    expect(out.result.x[0]).toBeCloseTo(0.4, 4);
    expect(out.result.x[1]).toBeCloseTo(1.8, 4);
  });

  it('detecta un problema infactible', () => {
    const out = service.solve({
      objective: SimplexObjective.MAX,
      c: [1, 1],
      constraints: [
        { coefficients: [1, 1], operator: '<=', rhs: 2 },
        { coefficients: [1, 1], operator: '>=', rhs: 5 },
      ],
    });
    expect(out.result.infeasible).toBe(true);
  });

  it('detecta un problema no acotado', () => {
    const out = service.solve({
      objective: SimplexObjective.MAX,
      c: [1, 0],
      constraints: [{ coefficients: [1, -1], operator: '<=', rhs: 1 }],
    });
    expect(out.result.unbounded).toBe(true);
  });

  it('un lado derecho negativo se normaliza (−x1 − x2 ≤ −2 equivale a x1 + x2 ≥ 2)', () => {
    const out = service.solve({
      objective: SimplexObjective.MIN,
      c: [1, 2],
      constraints: [{ coefficients: [-1, -1], operator: '<=', rhs: -2 }],
    });
    expect(out.result.z).toBeCloseTo(2, 4);
    expect(out.result.x[0]).toBeCloseTo(2, 4);
  });

  it('tolera una igualdad redundante', () => {
    const out = service.solve({
      objective: SimplexObjective.MAX,
      c: [1, 0],
      constraints: [
        { coefficients: [1, 1], operator: '=', rhs: 2 },
        { coefficients: [2, 2], operator: '=', rhs: 4 },
      ],
    });
    expect(out.result.z).toBeCloseTo(2, 4);
    expect(out.result.x[0]).toBeCloseTo(2, 4);
  });
  describe('validate (modo práctica)', () => {
    // Iteración 1: entra x2, sale s2 (12/2 = 6 < 18/2 = 9), pivote 2, Z = 30.
    // Iteración 2: entra x1, sale s3 (6/3 = 2 < 4/1 = 4), pivote 3, Z = 36.
    const modelo = {
      objective: SimplexObjective.MAX,
      c: [3, 5],
      constraints: [
        { coefficients: [1, 0], operator: '<=' as const, rhs: 4 },
        { coefficients: [0, 2], operator: '<=' as const, rhs: 12 },
        { coefficients: [3, 2], operator: '<=' as const, rhs: 18 },
      ],
    };

    it('acepta variable entrante, saliente, pivote y Z correctos (con «X_1» o «x₁»)', () => {
      const out = service.validate(modelo, [
        { iteration: 1, state: { entra: 'x2', sale: 's2', pivote: 2, z: 30 } },
        { iteration: 2, state: { entra: 'X_1', sale: 's₃', pivote: 3, z: 36 } },
      ]);
      expect(out.isCorrect).toBe(true);
      expect(out.matchedSteps).toBe(2);
      expect(out.totalSteps).toBe(2);
    });

    it('señala la variable saliente y el pivote equivocados', () => {
      const out = service.validate(modelo, [
        { iteration: 1, state: { entra: 'x2', sale: 's3', pivote: 2, z: 30 } },
        { iteration: 2, state: { entra: 'x1', sale: 's3', pivote: 1, z: 36 } },
      ]);
      expect(out.isCorrect).toBe(false);
      expect(out.feedback.some((f) => f.stepIndex === 0 && f.field === 'sale')).toBe(true);
      expect(out.feedback.some((f) => f.stepIndex === 1 && f.field === 'pivote')).toBe(true);
    });

    it('incluye los pivoteos de la fase 1 (objetivo W)', () => {
      // min x1 + x2 s.a. x1 + x2 >= 2: la fase 1 hace entrar x1 por a1 (pivote 1, W = 0).
      const out = service.validate(
        { objective: SimplexObjective.MIN, c: [1, 1], constraints: [{ coefficients: [1, 1], operator: '>=', rhs: 2 }] },
        [{ iteration: 1, state: { entra: 'x1', sale: 'a1', pivote: 1, z: 0 } }],
      );
      expect(out.isCorrect).toBe(true);
    });
  });
});
