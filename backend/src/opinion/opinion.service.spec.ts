import { OpinionService } from './opinion.service';
import { ITEMS } from './opinion.cuestionario';

const todas = (v: number) => Object.fromEntries(ITEMS.map((i) => [i.id, v]));

const SUS_90 = [5, 1, 5, 1, 4, 2, 5, 1, 4, 2];

function servicio(filas: any[] = [], previa: any = null) {
  const create = jest.fn((x) => x);
  const update = jest.fn((x) => x);
  const susCreate = jest.fn((x) => x);
  const susDelete = jest.fn((x) => x);
  const prisma: any = {
    opinionResponse: { findMany: jest.fn().mockResolvedValue(filas), findUnique: jest.fn().mockResolvedValue(previa), create, update },
    susResponse: { create: susCreate, deleteMany: susDelete },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { s: new OpinionService(prisma), create, update, susCreate, susDelete };
}

const fila = (valor: number, recommendation: number, extra: any = {}) => ({
  answers: todas(valor), recommendation, frequency: 'UNA_DOS', modules: ['bisection'],
  mostUseful: null, improvements: null, susAnswers: SUS_90, susScore: 90, createdAt: new Date('2026-10-01'), ...extra,
});

describe('OpinionService', () => {
  it('calcula promedios, acuerdo, desviación e índice de recomendación', async () => {
    const { s } = servicio([fila(5, 10), fila(4, 8), fila(2, 3, { modules: ['bisection', 'simplex'] })]);
    const r = await s.resultados();
    expect(r.n).toBe(3);
    expect(r.general.promedio).toBeCloseTo(3.67, 2);
    expect(r.general.acuerdo).toBeCloseTo(66.7, 1);
    expect(r.items[0].distribucion).toEqual([0, 1, 0, 1, 1]);
    expect(r.items[0].desviacion).toBeCloseTo(1.53, 2);
    // 1 promotor (10), 1 pasivo (8), 1 detractor (3) → NPS 0
    expect(r.recomendacion).toMatchObject({ promotores: 1, pasivos: 1, detractores: 1, nps: 0 });
    expect(r.modulos.find((m) => m.id === 'bisection')!.cantidad).toBe(3);
    expect(r.modulos.find((m) => m.id === 'simplex')!.cantidad).toBe(1);
  });

  it('no expone datos personales en los resultados', async () => {
    const { s } = servicio([{ ...fila(4, 9), userId: 'u1', user: { email: 'x@uts.edu.co' } }]);
    const texto = JSON.stringify(await s.resultados());
    expect(texto).not.toContain('u1');
    expect(texto).not.toContain('x@uts.edu.co');
  });

  it('sin respuestas devuelve ceros, no NaN', async () => {
    const { s } = servicio([]);
    const r = await s.resultados();
    expect(r.general.promedio).toBe(0);
    expect(r.recomendacion.nps).toBe(0);
  });

  it('exige responder todas las afirmaciones con valores de 1 a 5', async () => {
    const { s } = servicio();
    const base = { recommendation: 8, frequency: 'UNA_DOS', modules: [], susAnswers: SUS_90 };
    const incompletas = { ...todas(4) } as any;
    delete incompletas.U1;
    await expect(s.guardar('u1', { ...base, answers: incompletas })).rejects.toThrow('faltan: U1');
    await expect(s.guardar('u1', { ...base, answers: { ...todas(4), U2: 6 } })).rejects.toThrow('U2');
    await expect(s.guardar('u1', { ...base, answers: { ...todas(4), X9: 3 } })).rejects.toThrow('desconocidas');
  });

  it('la primera respuesta se crea (y quita módulos repetidos)', async () => {
    const { s, create } = servicio();
    await s.guardar('u1', { answers: todas(4), recommendation: 9, frequency: 'TRES_MAS', modules: ['simplex', 'simplex'], susAnswers: SUS_90 });
    expect(create.mock.calls[0][0].data).toMatchObject({ userId: 'u1', modules: ['simplex'] });
  });

  it('una vez enviada no se puede modificar', async () => {
    const { s, create, update } = servicio([], { susScore: 90 });
    await expect(
      s.guardar('u1', { answers: todas(2), recommendation: 1, frequency: 'TRES_MAS', modules: [], susAnswers: SUS_90 }),
    ).rejects.toThrow('no se pueden modificar');
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('una respuesta anterior a la SUS integrada se puede completar una vez', async () => {
    const { s, update, create } = servicio([], { susScore: null });
    await s.guardar('u1', { answers: todas(4), recommendation: 9, frequency: 'UNA_DOS', modules: [], susAnswers: SUS_90 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
    expect(create).not.toHaveBeenCalled();
  });

  it('calcula el puntaje SUS y lo registra también en la tabla de la SUS, reemplazando el anterior', async () => {
    const { s, susCreate, susDelete } = servicio();
    const r = await s.guardar('u1', { answers: todas(4), recommendation: 9, frequency: 'UNA_DOS', modules: [], susAnswers: SUS_90 });
    expect(r.susScore).toBe(90);
    expect(susDelete).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(susCreate).toHaveBeenCalledWith({ data: { userId: 'u1', answers: SUS_90, score: 90 } });
  });

  it('exige las 10 respuestas SUS entre 1 y 5', async () => {
    const { s } = servicio();
    const base = { answers: todas(4), recommendation: 9, frequency: 'UNA_DOS', modules: [] };
    await expect(s.guardar('u1', { ...base, susAnswers: [5, 1, 5] })).rejects.toThrow('SUS');
    await expect(s.guardar('u1', { ...base, susAnswers: [5, 1, 5, 1, 4, 2, 5, 1, 4, 9] })).rejects.toThrow('SUS');
  });

  it('resume la SUS: promedio, rango y porcentaje sobre 68', async () => {
    const { s } = servicio([
      fila(4, 9),
      fila(3, 7, { susAnswers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3], susScore: 50 }),
    ]);
    const r = await s.resultados();
    expect(r.sus).toMatchObject({ n: 2, promedio: 70, minimo: 50, maximo: 90, sobrePromedio: 50 });
    expect(r.sus.items[0]).toMatchObject({ numero: 1, positivo: true, promedio: 4 });
    expect(r.filas[0]).toMatchObject({ SUS1: 5, puntajeSUS: 90 });
  });
});
