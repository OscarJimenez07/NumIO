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
});
