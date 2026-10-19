import { calificar, preguntasPublicas } from './test.cuestionario';

describe('Cuestionario del pre-test y pos-test', () => {
  it('no envía la clave de respuestas al navegador', () => {
    const publicas = preguntasPublicas();
    expect(publicas).toHaveLength(6);
    expect(publicas.every((q) => !('correct' in q))).toBe(true);
  });

  it('califica en el servidor según la clave', () => {
    const todas = calificar({ q1: 1, q2: 2, q3: 1, q4: 1, q5: 1, q6: 1 });
    expect(todas).toEqual({ correct: 6, total: 6, score: 100 });
    expect(calificar({ q1: 1, q2: 2, q3: 1 }).score).toBeCloseTo(50, 6);
  });
});
