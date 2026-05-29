import { TrapezoidalService } from './trapezoidal.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('TrapezoidalService', () => {
  const service = new TrapezoidalService(new FeedbackService());

  it('integra x^2 en [0,1] con n=4 (≈ 0.34375)', () => {
    const out = service.solve({ fn: 'x^2', a: 0, b: 1, n: 4 });
    expect(out.result.integral).toBeCloseTo(0.34375, 5);
  });

  it('integra sin(x) en [0,π] con n=10', () => {
    const out = service.solve({ fn: 'sin(x)', a: 0, b: Math.PI, n: 10 });
    // Valor exacto: 2; trapezoidal subestima
    expect(out.result.integral).toBeGreaterThan(1.9);
    expect(out.result.integral).toBeLessThan(2.0);
  });
});
