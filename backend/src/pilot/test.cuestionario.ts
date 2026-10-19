/**
 * Cuestionario de conocimientos del pre-test y el pos-test.
 *
 * La clave de respuestas vive solo en el servidor: el frontend recibe las
 * preguntas sin la opción correcta (GET /pilot/cuestionario) y envía las
 * respuestas; la calificación se hace aquí. Antes se calificaba en el
 * navegador y la clave quedaba visible en el código descargado.
 */

export const PREGUNTAS = [
  {
    id: 'q1',
    text: '¿Cuál es la condición necesaria para aplicar el método de Bisección en [a, b]?',
    options: ['f(a) y f(b) tienen el mismo signo', 'f(a) · f(b) < 0', 'f es derivable en [a, b]', 'a > b'],
    correct: 1,
  },
  {
    id: 'q2',
    text: 'El método de Newton-Raphson requiere conocer:',
    options: [
      'La integral de f',
      'Un intervalo donde f cambia de signo',
      "La derivada f'(x) y un valor inicial x₀",
      'Una tabla de diferencias divididas',
    ],
    correct: 2,
  },
  {
    id: 'q3',
    text: 'La regla de Simpson 1/3 requiere que el número de subintervalos n sea:',
    options: ['Impar', 'Par', 'Múltiplo de 3', 'Cualquiera'],
    correct: 1,
  },
  {
    id: 'q4',
    text: 'En el método Símplex, el criterio de optimalidad para maximización es:',
    options: [
      'Todos los coeficientes en la fila Z son no positivos',
      'Todos los coeficientes en la fila Z son no negativos',
      'El RHS es positivo',
      'No hay variables artificiales',
    ],
    correct: 1,
  },
  {
    id: 'q5',
    text: 'La aproximación de Vogel se utiliza para:',
    options: [
      'Encontrar la solución óptima de un problema de transporte',
      'Construir una solución básica inicial en transporte',
      'Asignar tareas a personas',
      'Calcular derivadas numéricas',
    ],
    correct: 1,
  },
  {
    id: 'q6',
    text: 'El algoritmo Húngaro resuelve problemas de:',
    options: ['Programación lineal entera', 'Asignación 1-a-1', 'Integración numérica', 'Interpolación'],
    correct: 1,
  },
];

/** Preguntas sin la clave, para enviarlas al navegador. */
export function preguntasPublicas() {
  return PREGUNTAS.map(({ id, text, options }) => ({ id, text, options }));
}

/** Califica de 0 a 100 según la clave. Las preguntas sin responder cuentan como error. */
export function calificar(answers: Record<string, number>) {
  const correctas = PREGUNTAS.filter((q) => answers[q.id] === q.correct).length;
  return { correct: correctas, total: PREGUNTAS.length, score: (correctas / PREGUNTAS.length) * 100 };
}
