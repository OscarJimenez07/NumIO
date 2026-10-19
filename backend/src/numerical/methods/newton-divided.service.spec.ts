import { NewtonDividedService } from './newton-divided.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('NewtonDividedService', () => {
  const service = new NewtonDividedService(new FeedbackService());

  it('obtiene los coeficientes de la tabla de diferencias divididas', () => {
    // y = x^2 + 1 → puntos (0,1), (1,2), (2,5); coeficientes 1, 1, 1
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
    ];
    const out = service.solve({ points, evalAt: 3 });
    expect(out.result.coefficients).toEqual([1, 1, 1]);
    expect(out.result.evaluatedValue).toBeCloseTo(10, 6);
  });

  it('coincide con Lagrange en un polinomio cúbico', () => {
    // y = x^3 − 2x → P(1,5) = 0,375
    const points = [-1, 0, 1, 2].map((x) => ({ x, y: x ** 3 - 2 * x }));
    const out = service.solve({ points, evalAt: 1.5 });
    expect(out.result.evaluatedValue).toBeCloseTo(0.375, 6);
  });

  it('rechaza valores de x repetidos', () => {
    const points = [
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ];
    expect(() => service.solve({ points })).toThrow();
  });
});
