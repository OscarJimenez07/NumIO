import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OpinionDto } from './dto/opinion.dto';
import {
  DIMENSIONES,
  ESCALA,
  FRECUENCIAS,
  ITEMS,
  MODULOS,
  PREGUNTAS_ABIERTAS,
  RECOMENDACION,
  SUS_ITEMS,
  puntajeSus,
} from './opinion.cuestionario';

@Injectable()
export class OpinionService {
  constructor(private readonly prisma: PrismaService) {}

  cuestionario() {
    return {
      dimensiones: DIMENSIONES,
      items: ITEMS,
      escala: ESCALA,
      recomendacion: RECOMENDACION,
      frecuencias: FRECUENCIAS,
      modulos: MODULOS,
      abiertas: PREGUNTAS_ABIERTAS,
      sus: SUS_ITEMS,
    };
  }

  mia(userId: string) {
    return this.prisma.opinionResponse.findUnique({
      where: { userId },
      select: {
        answers: true,
        recommendation: true,
        frequency: true,
        modules: true,
        mostUseful: true,
        improvements: true,
        susAnswers: true,
        susScore: true,
        createdAt: true,
      },
    });
  }

  /**
   * Guarda la encuesta. Se responde una sola vez: los datos quedan fijos para
   * que los resultados del piloto no cambien después de analizarlos.
   *
   * Única excepción: una respuesta enviada antes de que la SUS formara parte
   * de la encuesta (sin susScore) puede completarse una vez; desde ese
   * momento también queda fija.
   */
  async guardar(userId: string, dto: OpinionDto) {
    const previa = await this.prisma.opinionResponse.findUnique({ where: { userId }, select: { susScore: true } });
    if (previa && previa.susScore !== null) {
      throw new ConflictException('Ya respondiste esta encuesta. Las respuestas quedan registradas y no se pueden modificar.');
    }
    const ids = ITEMS.map((i) => i.id as string);
    const extra = Object.keys(dto.answers).filter((k) => !ids.includes(k));
    if (extra.length) throw new BadRequestException(`Preguntas desconocidas: ${extra.join(', ')}.`);
    const faltan = ids.filter((id) => !Number.isInteger(dto.answers[id]) || dto.answers[id] < 1 || dto.answers[id] > 5);
    if (faltan.length) {
      throw new BadRequestException(`Responde todas las afirmaciones con un valor de 1 a 5 (faltan: ${faltan.join(', ')}).`);
    }
    if (!FRECUENCIAS.some((f) => f.id === dto.frequency)) {
      throw new BadRequestException('Indica con qué frecuencia usaste la plataforma.');
    }
    const sus = dto.susAnswers ?? [];
    if (sus.length !== SUS_ITEMS.length || sus.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) {
      throw new BadRequestException('Responde las 10 afirmaciones de usabilidad (SUS) con un valor de 1 a 5.');
    }
    const modulos = [...new Set(dto.modules)];
    if (modulos.some((m) => !MODULOS.some((x) => x.id === m))) {
      throw new BadRequestException('Hay un módulo que no existe en la lista.');
    }

    const datos = {
      answers: Object.fromEntries(ids.map((id) => [id, dto.answers[id]])),
      recommendation: dto.recommendation,
      frequency: dto.frequency,
      modules: modulos,
      mostUseful: dto.mostUseful?.trim() || null,
      improvements: dto.improvements?.trim() || null,
      susAnswers: sus,
      susScore: puntajeSus(sus),
    };
    // La SUS también queda en su propia tabla, que es la que resume
    // «Resultados piloto». Si había una SUS suelta de la página anterior a la
    // encuesta unificada, se reemplaza para no contar a la persona dos veces.
    try {
      await this.prisma.$transaction([
        previa
          ? this.prisma.opinionResponse.update({ where: { userId }, data: datos })
          : this.prisma.opinionResponse.create({ data: { userId, ...datos } }),
        this.prisma.susResponse.deleteMany({ where: { userId } }),
        this.prisma.susResponse.create({ data: { userId, answers: sus, score: datos.susScore } }),
      ]);
    } catch (e) {
      // Dos envíos simultáneos (doble clic): el segundo choca con la llave única.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya respondiste esta encuesta. Las respuestas quedan registradas y no se pueden modificar.');
      }
      throw e;
    }
    return { ok: true, susScore: datos.susScore };
  }

  /**
   * Resultados agregados. No se devuelve ningún dato que identifique a quien
   * respondió: ni nombre, ni correo, ni identificador. Las filas para CSV se
   * numeran R1, R2… en orden de llegada.
   */
  async resultados() {
    const filas = await this.prisma.opinionResponse.findMany({ orderBy: { createdAt: 'asc' } });
    const n = filas.length;
    const resp = filas.map((f) => ({
      answers: f.answers as Record<string, number>,
      recommendation: f.recommendation,
      frequency: f.frequency,
      modules: (f.modules as string[]) ?? [],
      mostUseful: f.mostUseful,
      improvements: f.improvements,
      susAnswers: (f.susAnswers as number[] | null) ?? null,
      susScore: f.susScore,
      createdAt: f.createdAt,
    }));
    const conSus = resp.filter((r) => r.susScore !== null && r.susAnswers);
    const puntajes = conSus.map((r) => r.susScore as number);

    const items = ITEMS.map((it) => {
      const valores = resp.map((r) => r.answers[it.id]).filter((v) => Number.isInteger(v));
      const distribucion = [1, 2, 3, 4, 5].map((k) => valores.filter((v) => v === k).length);
      return {
        id: it.id,
        dimension: it.dimension,
        texto: it.texto,
        promedio: redondear(media(valores)),
        desviacion: redondear(desviacion(valores)),
        distribucion,
        acuerdo: porcentaje(distribucion[3] + distribucion[4], valores.length),
      };
    });

    const dimensiones = DIMENSIONES.map((d) => {
      const valores = resp.flatMap((r) =>
        ITEMS.filter((i) => i.dimension === d.id).map((i) => r.answers[i.id]),
      );
      return {
        id: d.id,
        nombre: d.nombre,
        promedio: redondear(media(valores)),
        acuerdo: porcentaje(valores.filter((v) => v >= 4).length, valores.length),
      };
    });

    const todas = resp.flatMap((r) => ITEMS.map((i) => r.answers[i.id]));
    const rec = resp.map((r) => r.recommendation);
    const promotores = rec.filter((v) => v >= 9).length;
    const detractores = rec.filter((v) => v <= 6).length;

    return {
      n,
      general: {
        promedio: redondear(media(todas)),
        acuerdo: porcentaje(todas.filter((v) => v >= 4).length, todas.length),
      },
      dimensiones,
      items,
      recomendacion: {
        promedio: redondear(media(rec)),
        distribucion: Array.from({ length: 11 }, (_, k) => rec.filter((v) => v === k).length),
        promotores,
        pasivos: n - promotores - detractores,
        detractores,
        // Índice neto de recomendación: % promotores − % detractores (−100 a 100).
        nps: n ? Math.round(((promotores - detractores) / n) * 100) : 0,
      },
      sus: {
        n: conSus.length,
        promedio: redondear(media(puntajes)),
        desviacion: redondear(desviacion(puntajes)),
        minimo: puntajes.length ? Math.min(...puntajes) : 0,
        maximo: puntajes.length ? Math.max(...puntajes) : 0,
        // 68 es el promedio de referencia de la escala (Bangor, Kortum y Miller).
        sobrePromedio: porcentaje(puntajes.filter((p) => p > 68).length, puntajes.length),
        items: SUS_ITEMS.map((texto, k) => ({
          numero: k + 1,
          texto,
          positivo: k % 2 === 0,
          promedio: redondear(media(conSus.map((r) => (r.susAnswers as number[])[k]))),
        })),
      },
      frecuencia: FRECUENCIAS.map((f) => ({ id: f.id, texto: f.texto, cantidad: resp.filter((r) => r.frequency === f.id).length })),
      modulos: MODULOS.map((m) => ({ id: m.id, texto: m.texto, cantidad: resp.filter((r) => r.modules.includes(m.id)).length })),
      comentarios: {
        mostUseful: resp.map((r) => r.mostUseful).filter((t): t is string => !!t),
        improvements: resp.map((r) => r.improvements).filter((t): t is string => !!t),
      },
      filas: resp.map((r, k) => ({
        respuesta: `R${k + 1}`,
        fecha: r.createdAt.toISOString().slice(0, 10),
        ...Object.fromEntries(ITEMS.map((i) => [i.id, r.answers[i.id]])),
        recomendacion: r.recommendation,
        frecuencia: FRECUENCIAS.find((f) => f.id === r.frequency)?.texto ?? r.frequency,
        modulos: r.modules.map((m) => MODULOS.find((x) => x.id === m)?.texto ?? m).join('; '),
        ...Object.fromEntries(SUS_ITEMS.map((_, k) => [`SUS${k + 1}`, r.susAnswers?.[k] ?? ''])),
        puntajeSUS: r.susScore ?? '',
        loMasUtil: r.mostUseful ?? '',
        mejoras: r.improvements ?? '',
      })),
    };
  }
}

function media(v: number[]): number {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

/** Desviación estándar muestral (n − 1). */
function desviacion(v: number[]): number {
  if (v.length < 2) return 0;
  const m = media(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
}

function porcentaje(parte: number, total: number): number {
  return total ? Math.round((parte / total) * 1000) / 10 : 0;
}

function redondear(x: number): number {
  return Math.round(x * 100) / 100;
}
