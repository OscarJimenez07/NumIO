import { BisectionService } from './bisection.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('BisectionService', () => {
  const service = new BisectionService(new FeedbackService());

  it('encuentra raíz de x^3 - x - 2 en [1, 2] (Burden & Faires, ej. clásico)', () => {
    const out = service.solve({ fn: 'x^3 - x - 2', a: 1, b: 2, tolerance: 1e-4 });
    expect(out.result.converged).toBe(true);
    expect(out.result.root).toBeCloseTo(1.5213, 3);
  });

  it('rechaza intervalo sin cambio de signo', () => {
    expect(() => service.solve({ fn: 'x^2 + 1', a: 0, b: 1 })).toThrow();
  });

  it('encuentra raíz de cos(x) - x en [0, 1]', () => {
    const out = service.solve({ fn: 'cos(x) - x', a: 0, b: 1, tolerance: 1e-5 });
    expect(out.result.root).toBeCloseTo(0.7390851, 4);
  });
});
