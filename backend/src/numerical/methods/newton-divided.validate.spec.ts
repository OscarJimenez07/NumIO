import { NewtonDividedService } from './newton-divided.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('NewtonDividedService.validate (modo práctica)', () => {
  const service = new NewtonDividedService(new FeedbackService());
  // y = x^2 + 1 → b_0 = 1, b_1 = 1, b_2 = 1; en x = 3: T = 1, 3, 6 y P(3) = 10
  const points = [
    { x: 0, y: 1 },
    { x: 1, y: 2 },
    { x: 2, y: 5 },
  ];

  it('acepta coeficientes, términos y sumas parciales correctos', () => {
    const out = service.validate({ points, evalAt: 3 }, [
      { iteration: 0, state: { coeficiente: 1, termino: 1, sumaParcial: 1 } },
      { iteration: 1, state: { coeficiente: 1, termino: 3, sumaParcial: 4 } },
      { iteration: 2, state: { coeficiente: 1, termino: 6, sumaParcial: 10 } },
    ]);
    expect(out.isCorrect).toBe(true);
    expect(out.matchedSteps).toBe(3);
    expect(out.feedback).toHaveLength(0);
  });

  it('señala un coeficiente mal calculado', () => {
    const out = service.validate({ points, evalAt: 3 }, [
      { iteration: 0, state: { coeficiente: 1, termino: 1, sumaParcial: 1 } },
      { iteration: 1, state: { coeficiente: 2, termino: 3, sumaParcial: 4 } },
      { iteration: 2, state: { coeficiente: 1, termino: 6, sumaParcial: 10 } },
    ]);
    expect(out.isCorrect).toBe(false);
    expect(out.matchedSteps).toBe(2);
    expect(out.feedback.some((f) => f.stepIndex === 1 && f.field === 'coeficiente')).toBe(true);
  });

  it('sin punto de evaluación solo compara los coeficientes', () => {
    const out = service.validate({ points }, [
      { iteration: 0, state: { coeficiente: 1 } },
      { iteration: 1, state: { coeficiente: 1 } },
      { iteration: 2, state: { coeficiente: 1 } },
    ]);
    expect(out.isCorrect).toBe(true);
  });
});
