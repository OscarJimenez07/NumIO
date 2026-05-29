import { FeedbackService } from './feedback.service';
import { Step } from './feedback.types';

describe('FeedbackService', () => {
  const service = new FeedbackService();

  const expected: Step[] = [
    { iteration: 1, state: { a: 1, b: 2, c: 1.5 } },
    { iteration: 2, state: { a: 1, b: 1.5, c: 1.25 } },
  ];

  it('coincidencia exacta marca isCorrect=true', () => {
    const out = service.compare(expected, expected);
    expect(out.isCorrect).toBe(true);
    expect(out.feedback.length).toBe(0);
  });

  it('detecta desviación numérica', () => {
    const user: Step[] = [
      { iteration: 1, state: { a: 1, b: 2, c: 1.6 } },
      { iteration: 2, state: { a: 1, b: 1.5, c: 1.25 } },
    ];
    const out = service.compare(expected, user);
    expect(out.isCorrect).toBe(false);
    expect(out.feedback.some((f) => f.field === 'c')).toBe(true);
  });

  it('avisa pasos faltantes', () => {
    const out = service.compare(expected, [expected[0]]);
    expect(out.feedback.some((f) => f.field === '__steps__')).toBe(true);
  });
});
