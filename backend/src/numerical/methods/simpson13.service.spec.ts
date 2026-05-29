import { Simpson13Service } from './simpson13.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('Simpson13Service', () => {
  const service = new Simpson13Service(new FeedbackService());

  it('integra x^2 en [0,1] con n=4 (exacto ≈ 1/3)', () => {
    const out = service.solve({ fn: 'x^2', a: 0, b: 1, n: 4 });
    expect(out.result.integral).toBeCloseTo(1 / 3, 6);
  });

  it('exige n par', () => {
    expect(() => service.solve({ fn: 'x^2', a: 0, b: 1, n: 3 })).toThrow();
  });
});
