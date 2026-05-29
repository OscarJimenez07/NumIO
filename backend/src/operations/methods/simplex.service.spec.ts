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
});
