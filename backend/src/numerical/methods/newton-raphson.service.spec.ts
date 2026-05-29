import { NewtonRaphsonService } from './newton-raphson.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('NewtonRaphsonService', () => {
  const service = new NewtonRaphsonService(new FeedbackService());

  it('encuentra raíz de x^2 - 2 (sqrt(2)) iniciando en x0=1', () => {
    const out = service.solve({ fn: 'x^2 - 2', x0: 1, tolerance: 1e-8 });
    expect(out.result.root).toBeCloseTo(Math.SQRT2, 6);
  });

  it('encuentra raíz de cos(x) - x iniciando en x0=0.5', () => {
    const out = service.solve({ fn: 'cos(x) - x', x0: 0.5, tolerance: 1e-8 });
    expect(out.result.root).toBeCloseTo(0.7390851332, 6);
  });
});
