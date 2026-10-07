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

  it('califica solo las iteraciones enviadas (el formulario pide las primeras)', () => {
    const out = service.compare(expected, [expected[0]]);
    expect(out.isCorrect).toBe(true);
    expect(out.matchedSteps).toBe(1);
    expect(out.totalSteps).toBe(1);
    expect(out.feedback.length).toBe(0);
  });

  it('un error en las iteraciones enviadas sigue marcando isCorrect=false', () => {
    const out = service.compare(expected, [{ iteration: 1, state: { a: 1, b: 2, c: 1.7 } }]);
    expect(out.isCorrect).toBe(false);
    expect(out.feedback.some((f) => f.field === 'c')).toBe(true);
  });

  it('iteraciones de más cuentan como error', () => {
    const extra: Step[] = [...expected, { iteration: 3, state: { a: 1, b: 1.25, c: 1.125 } }];
    const out = service.compare(expected, extra);
    expect(out.isCorrect).toBe(false);
    expect(out.feedback.some((f) => f.field === 'iteraciones')).toBe(true);
  });

  it('sin iteraciones enviadas no hay nada que dar por correcto', () => {
    expect(service.compare(expected, []).isCorrect).toBe(false);
  });
});
