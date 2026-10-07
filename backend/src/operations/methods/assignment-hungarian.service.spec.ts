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
});
