import { Simpson38Service } from './simpson38.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('Simpson38Service', () => {
  const service = new Simpson38Service(new FeedbackService());

  it('integra x^3 en [0,1] con n=3 (exacto = 1/4)', () => {
    const out = service.solve({ fn: 'x^3', a: 0, b: 1, n: 3 });
    expect(out.result.integral).toBeCloseTo(0.25, 6);
  });

  it('aproxima ∫ sin(x) en [0, pi] con n=6 (exacto = 2)', () => {
    const out = service.solve({ fn: 'sin(x)', a: 0, b: Math.PI, n: 6 });
    expect(out.result.integral).toBeCloseTo(2, 2);
  });

  it('exige n múltiplo de 3', () => {
    expect(() => service.solve({ fn: 'x^2', a: 0, b: 1, n: 4 })).toThrow();
  });
});
