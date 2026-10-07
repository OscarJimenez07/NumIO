/**
 * Cuestionario de opinión sobre NumIO.
 *
 * Mide la percepción del estudiante en cuatro dimensiones con afirmaciones en
 * escala Likert de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo),
 * más una pregunta de recomendación de 0 a 10, la frecuencia de uso, los
 * módulos más útiles y dos preguntas abiertas opcionales. Complementa a la
 * escala SUS: esta mide usabilidad; aquí se mide utilidad para aprender y
 * satisfacción. Todas las afirmaciones están redactadas en positivo, de modo
 * que un promedio más alto siempre es mejor.
 *
 * Es la única definición: el frontend la pide a GET /opinion/cuestionario.
 */

export const DIMENSIONES = [
  { id: 'U', nombre: 'Utilidad para el aprendizaje' },
  { id: 'R', nombre: 'Práctica y retroalimentación' },
  { id: 'F', nombre: 'Facilidad de uso' },
  { id: 'S', nombre: 'Satisfacción e intención de uso' },
] as const;

export const ITEMS = [
  { id: 'U1', dimension: 'U', texto: 'NumIO me ayudó a entender mejor los métodos de análisis numérico e investigación de operaciones.' },
  { id: 'U2', dimension: 'U', texto: 'Ver la solución paso a paso me ayudó a comprender el procedimiento de cada método.' },
  { id: 'U3', dimension: 'U', texto: 'Las gráficas me ayudaron a visualizar lo que ocurre en cada iteración.' },
  { id: 'U4', dimension: 'U', texto: 'Usar NumIO mejoró mi desempeño en los ejercicios de la asignatura.' },
  { id: 'R1', dimension: 'R', texto: 'El modo «Practicar paso a paso» me ayudó a comprobar si sabía resolver los ejercicios.' },
  { id: 'R2', dimension: 'R', texto: 'Los mensajes de retroalimentación me ayudaron a identificar y corregir mis errores.' },
  { id: 'R3', dimension: 'R', texto: 'Después de practicar en NumIO me sentí más seguro/a para resolver ejercicios por mi cuenta.' },
  { id: 'F1', dimension: 'F', texto: 'Fue fácil ingresar los datos de los ejercicios.' },
  { id: 'F2', dimension: 'F', texto: 'Las explicaciones y fórmulas que muestra la plataforma son claras.' },
  { id: 'S1', dimension: 'S', texto: 'En general, estoy satisfecho/a con NumIO.' },
  { id: 'S2', dimension: 'S', texto: 'Me gustaría seguir usando NumIO en esta y en otras asignaturas.' },
  { id: 'S3', dimension: 'S', texto: 'Prefiero estudiar con NumIO que solo con cuaderno, calculadora u hoja de cálculo.' },
] as const;

export const ESCALA = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Ni de acuerdo ni en desacuerdo',
  'De acuerdo',
  'Totalmente de acuerdo',
] as const;

export const RECOMENDACION = '¿Qué tan probable es que recomiendes NumIO a un compañero? (0 = nada probable, 10 = muy probable)';

export const FRECUENCIAS = [
  { id: 'MENOS_SEMANAL', texto: 'Menos de una vez por semana' },
  { id: 'UNA_DOS', texto: '1 o 2 veces por semana' },
  { id: 'TRES_MAS', texto: '3 o más veces por semana' },
] as const;

export const MODULOS = [
  { id: 'bisection', texto: 'Bisección' },
  { id: 'newton-raphson', texto: 'Newton-Raphson' },
  { id: 'lagrange', texto: 'Interpolación de Lagrange' },
  { id: 'newton-divided', texto: 'Diferencias divididas de Newton' },
  { id: 'trapezoidal', texto: 'Regla del Trapecio' },
  { id: 'simpson-1-3', texto: 'Simpson 1/3' },
  { id: 'simpson-3-8', texto: 'Simpson 3/8' },
  { id: 'simplex', texto: 'Método Símplex' },
  { id: 'transportation', texto: 'Problema de Transporte' },
  { id: 'assignment', texto: 'Problema de Asignación' },
] as const;

export const PREGUNTAS_ABIERTAS = {
  mostUseful: '¿Qué fue lo que más te sirvió de NumIO? (opcional)',
  improvements: '¿Qué mejorarías o agregarías? (opcional)',
} as const;

/**
 * Escala de Usabilidad del Sistema (SUS, Brooke 1996), en su versión en
 * español. Va dentro de la misma encuesta para que el estudiante llene un solo
 * formulario. Las afirmaciones pares están en negativo a propósito: así lo
 * exige el instrumento estandarizado y no deben reescribirse.
 */
export const SUS_ITEMS = [
  'Creo que me gustaría usar este sistema con frecuencia.',
  'Encontré el sistema innecesariamente complejo.',
  'Pensé que el sistema era fácil de usar.',
  'Creo que necesitaría apoyo de un técnico para poder usarlo.',
  'Encontré que las funciones del sistema estaban bien integradas.',
  'Pensé que había demasiada inconsistencia en el sistema.',
  'Imagino que la mayoría de la gente aprendería a usar este sistema rápidamente.',
  'Encontré el sistema muy engorroso de usar.',
  'Me sentí muy seguro/a usando el sistema.',
  'Necesité aprender muchas cosas antes de poder empezar a usar el sistema.',
] as const;

/**
 * Puntaje SUS estándar de 0 a 100: los ítems impares aportan (valor − 1), los
 * pares (5 − valor), y la suma se multiplica por 2,5.
 */
export function puntajeSus(respuestas: number[]): number {
  let suma = 0;
  for (let i = 0; i < 10; i++) suma += i % 2 === 0 ? respuestas[i] - 1 : 5 - respuestas[i];
  return suma * 2.5;
}
