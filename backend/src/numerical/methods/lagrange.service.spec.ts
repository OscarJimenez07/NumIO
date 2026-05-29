import { LagrangeService } from './lagrange.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('LagrangeService', () => {
  const service = new LagrangeService(new FeedbackService());

  it('interpola y reproduce los puntos exactos', () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 7 },
    ];
    const out = service.solve({ points, evalAt: 1 });
    expect(out.result.evaluatedValue).toBeCloseTo(3, 6);
  });

  it('interpola un polinomio cuadrático', () => {
    // y = x^2 + 1 → puntos (0,1), (1,2), (2,5); P(3) = 10
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
    ];
    const out = service.solve({ points, evalAt: 3 });
    expect(out.result.evaluatedValue).toBeCloseTo(10, 6);
  });
});
