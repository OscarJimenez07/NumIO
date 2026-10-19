import { TransportationModiService } from './transportation-modi.service';
import { TransportationVogelService } from './transportation-vogel.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('TransportationModiService', () => {
  const vogel = new TransportationVogelService();
  const service = new TransportationModiService(vogel, new FeedbackService());

  it('Problema balanceado clásico', () => {
    // Taha — 3 fuentes / 4 destinos
    const costs = [
      [10, 2, 20, 11],
      [12, 7, 9, 20],
      [4, 14, 16, 18],
    ];
    const supply = [15, 25, 10];
    const demand = [5, 15, 15, 15];

    const out = service.solve({ costs, supply, demand });
    // Óptimo conocido del problema (SunRay Transport, Taha): 435
    expect(out.result.totalCost).toBeCloseTo(435, 4);
  });

  it('Rechaza problema no balanceado', () => {
    expect(() =>
      service.solve({
        costs: [[1, 2], [3, 4]],
        supply: [10, 20],
        demand: [10, 5],
      }),
    ).toThrow();
  });
  describe('validate (modo práctica: asignaciones de Vogel)', () => {
    const costs = [
      [10, 2, 20, 11],
      [12, 7, 9, 20],
      [4, 14, 16, 18],
    ];
    const supply = [15, 25, 10];
    const demand = [5, 15, 15, 15];
    // Vogel: F3→D1 (5), F1→D2 (15), F2→D3 (15), F2→D4 (10), F3→D4 (5); costo inicial 475.
    const correctos = [
      { fila: 3, columna: 1, cantidad: 5, costoAcumulado: 20 },
      { fila: 1, columna: 2, cantidad: 15, costoAcumulado: 50 },
      { fila: 2, columna: 3, cantidad: 15, costoAcumulado: 185 },
      { fila: 2, columna: 4, cantidad: 10, costoAcumulado: 385 },
      { fila: 3, columna: 4, cantidad: 5, costoAcumulado: 475 },
    ];

    it('acepta celdas, cantidades y costo acumulado correctos', () => {
      const out = service.validate(
        { costs, supply, demand },
        correctos.map((state, k) => ({ iteration: k + 1, state })),
      );
      expect(out.isCorrect).toBe(true);
      expect(out.matchedSteps).toBe(5);
    });

    it('señala una celda equivocada y su costo acumulado', () => {
      const pasos = correctos.map((state, k) => ({ iteration: k + 1, state: { ...state } }));
      pasos[0].state = { fila: 1, columna: 2, cantidad: 15, costoAcumulado: 30 };
      const out = service.validate({ costs, supply, demand }, pasos);
      expect(out.isCorrect).toBe(false);
      expect(out.feedback.some((f) => f.stepIndex === 0 && f.field === 'fila')).toBe(true);
      expect(out.feedback.some((f) => f.stepIndex === 0 && f.field === 'costoAcumulado')).toBe(true);
    });
  });
});
