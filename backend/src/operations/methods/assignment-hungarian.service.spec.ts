import { AssignmentHungarianService } from './assignment-hungarian.service';
import { FeedbackService } from '../../feedback/feedback.service';

describe('AssignmentHungarianService', () => {
  const service = new AssignmentHungarianService(new FeedbackService());

  it('Resuelve matriz 3x3 clásica', () => {
    // Costo mínimo = 16 (asignación 1→1, 2→3, 3→2: 3 + 7 + 6)
    const costs = [
      [3, 5, 11],
      [4, 8, 7],
      [9, 6, 10],
    ];
    const out = service.solve({ costs });
    expect(out.result.totalCost).toBeCloseTo(16, 4);
  });

  it('Maximización: invierte la matriz', () => {
    const costs = [
      [10, 5, 13],
      [3, 9, 18],
      [10, 7, 2],
    ];
    const out = service.solve({ costs, maximize: true });
    // Asignación máxima: 10 + 18 + 7 = 35
    expect(out.result.totalCost).toBeCloseTo(35, 4);
  });
  describe('validate (modo práctica)', () => {
    const costs = [
      [3, 5, 11],
      [4, 8, 7],
      [9, 6, 10],
    ];
    // Mínimos de fila 3, 4, 6; de columna 0, 0, 3; T1→R1, T2→R3, T3→R2; costo 3, 10, 16.
    const correctos = [
      { minFila: 3, minColumna: 0, recurso: 1, costoAcumulado: 3 },
      { minFila: 4, minColumna: 0, recurso: 3, costoAcumulado: 10 },
      { minFila: 6, minColumna: 3, recurso: 2, costoAcumulado: 16 },
    ];

    it('acepta reducciones, asignaciones y costo acumulado correctos', () => {
      const out = service.validate({ costs }, correctos.map((state, k) => ({ iteration: k + 1, state })));
      expect(out.isCorrect).toBe(true);
      expect(out.matchedSteps).toBe(3);
    });

    it('señala una reducción y una asignación equivocadas', () => {
      const out = service.validate({ costs }, [
        { iteration: 1, state: { minFila: 3, minColumna: 0, recurso: 2, costoAcumulado: 5 } },
        { iteration: 2, state: { minFila: 4, minColumna: 0, recurso: 3, costoAcumulado: 12 } },
        { iteration: 3, state: { minFila: 6, minColumna: 2, recurso: 1, costoAcumulado: 21 } },
      ]);
      expect(out.isCorrect).toBe(false);
      expect(out.feedback.some((f) => f.stepIndex === 0 && f.field === 'recurso')).toBe(true);
      expect(out.feedback.some((f) => f.stepIndex === 2 && f.field === 'minColumna')).toBe(true);
    });

    it('acepta otra asignación óptima con el mismo costo total', () => {
      const empate = [
        [1, 1],
        [1, 1],
      ];
      const out = service.validate({ costs: empate }, [
        { iteration: 1, state: { minFila: 1, minColumna: 0, recurso: 2, costoAcumulado: 1 } },
        { iteration: 2, state: { minFila: 1, minColumna: 0, recurso: 1, costoAcumulado: 2 } },
      ]);
      expect(out.isCorrect).toBe(true);
    });
  });
});
