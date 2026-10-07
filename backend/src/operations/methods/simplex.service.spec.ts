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
});
